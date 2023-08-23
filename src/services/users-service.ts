import { db } from '../firebase';
import { DBUserData, UserData, Conversation, ConversationPreview, ChatRole, UserConversationProfile } from '../models';
import profileService from './profiles-service';
import { chunk, cleanUndefinedFields, parseDBUserData } from '../utils/request-utils';
import { Socket } from 'socket.io';
import { FieldValue } from 'firebase-admin/firestore';
import { parseDBConvo } from '../utils/conversation-utils';

const usersCol = db.collection('users');
const conversationsCol = db.collection('conversations');

const getUser = async (userId: string): Promise<UserData | never> => {
    try {
        const currentUser = await usersCol.doc(userId).get();
        if (!currentUser.exists) {
            return Promise.reject('User does not exist');
        }
        return parseDBUserData(currentUser.data() as DBUserData);
    } catch (err) {
        return Promise.reject(err);
    }
};

const getMultipleUsers = async (userIds: string[]): Promise<UserData[] | never> => {
    try {
        if (userIds.length < 1) return Promise.reject('invalid input');
        const batches = chunk<string>(userIds, 10);
        const res: UserData[] = [];
        await Promise.all(
            batches.map(async (batch) => {
                const userDocs = await usersCol.where('id', 'in', batch).get();
                if (!userDocs.empty) {
                    userDocs.forEach((doc) => {
                        res.push(parseDBUserData(doc.data() as DBUserData));
                    });
                }
            })
        );
        if (res.length > 0) return res;
        return Promise.reject('No results found');
    } catch (err) {
        return Promise.reject(err);
    }
};

const createNewUser = async (userId: string, userDetails: UserData): Promise<UserData | never> => {
    try {
        const newUser: UserData = {
            ...userDetails,
            id: userId
        };
        if (!(await checkValidHandle(newUser))) {
            return Promise.reject('Handle taken');
        } else if (!(await checkValidPhone(newUser))) {
            return Promise.reject('Phone number in use');
        }
        await usersCol.doc(userId).set(cleanUndefinedFields(newUser));
        await profileService.createNewProfile(newUser);
        return newUser;
    } catch (err) {
        return Promise.reject(err);
    }
};

// modifying this function so that it no longer touches conversation previews -> all updates to previews should happen on message send/convo creation
const updateUser = async (userId: string, updatedUserDetails: UserData): Promise<UserData | never> => {
    try {
        const currUser = await getUser(userId);
        const updatedUser: UserData = {
            ...currUser,
            ...updatedUserDetails,
            conversations: currUser.conversations.map((c) => cleanUndefinedFields(c)),
            id: currUser.id
        };
        if (currUser?.handle !== updatedUserDetails.handle && !(await checkValidHandle(updatedUser))) {
            return Promise.reject('Handle taken');
        } else if (currUser?.phone !== updatedUserDetails.phone && !(await checkValidPhone(updatedUser))) {
            return Promise.reject('Phone number in use');
        }
        await usersCol.doc(userId).update(cleanUndefinedFields(updatedUser));
        await profileService.updateProfile(cleanUndefinedFields(updatedUser));
        return updatedUser;
    } catch (err) {
        return Promise.reject(err);
    }
};

const getSocketUser = async (socket: Socket): Promise<UserData | never> => {
    try {
        const userId = socket.data.user.uid;
        const socketUser: UserData = await getUser(userId);
        return socketUser;
    } catch (err) {
        return Promise.reject(err);
    }
};

const checkValidHandle = async (userData: UserData): Promise<boolean | never> => {
    try {
        if (!userData.handle) return false;
        const matchingHandles = await usersCol.where('handle', '==', userData.handle).get();
        if (matchingHandles.empty) return true;
        return false;
    } catch (err) {
        return Promise.reject(err);
    }
};

const checkValidPhone = async (userData: UserData): Promise<boolean | never> => {
    try {
        if (!userData.phone) return true;
        const matchingHandles = await usersCol.where('phone', '==', userData.phone).get();
        if (matchingHandles.empty) return true;
        return false;
    } catch (err) {
        return Promise.reject(err);
    }
};

const handleReadReceipt = async (uid: string, cid: string) => {
    try {
        const userDoc = await usersCol.doc(uid).get();
        if (userDoc.exists) {
            const user = parseDBUserData(userDoc.data() as DBUserData);
            const previews = user.conversations.filter((c) => c.cid === cid);
            if (previews && previews.length > 0) {
                const preview = previews[0];
                const updatedUser = {
                    ...user,
                    conversations: [
                        ...user.conversations.filter((c) => c.cid !== cid),
                        {
                            ...preview,
                            unSeenMessages: 0
                        }
                    ]
                };
                return usersService.updateUser(uid, updatedUser);
            }
            return Promise.reject('conversation preview not found');
        }
        return Promise.reject('user not found');
    } catch (err) {
        return Promise.reject(err);
    }
};

const updatePushNotificationTokens = async (newToken: string, userId: string) => {
    console.log(`PNTOKEN: ${newToken}`);
    try {
        const user = await getUser(userId);
        if (user.pushTokens && user.pushTokens.includes(newToken)) {
            return;
        }
        const updateRes = await usersCol.doc(userId).update({
            pushTokens: FieldValue.arrayUnion(newToken)
        });
        return updateRes;
    } catch (err) {
        console.log(err);
        return;
    }
};

const updatePreviewDetails = async (updatedConvo: Conversation, userId: string) => {
    try {
        const relevantUpdates = cleanUndefinedFields({
            name: updatedConvo.name,
            avatar: updatedConvo.avatar
        });
        const user = await getUser(userId);
        const matchingPreviews = user.conversations.filter((c) => c.cid === updatedConvo.id);
        if (matchingPreviews.length > 0) {
            const preview = matchingPreviews[0];
            const updatedPreview: ConversationPreview = {
                ...preview,
                ...relevantUpdates
            };
            const res = await usersCol.doc(userId).update({
                conversations: [
                    cleanUndefinedFields(updatedPreview),
                    ...user.conversations.filter((c) => c.cid !== updatedConvo.id).map((c) => cleanUndefinedFields(c))
                ]
            });
            return res;
        }
        return Promise.reject('no such preview');
    } catch (err) {
        return Promise.reject(err);
    }
};

const handleLeaveConversation = async (cid: string, userId: string) => {
    try {
        const user = await getUser(userId);
        const filteredConvos = user.conversations.filter((c) => c.cid !== cid).map((c) => cleanUndefinedFields(c));
        if (!filteredConvos) return;
        const res = usersCol.doc(userId).update({
            conversations: filteredConvos
        });
        return res;
    } catch (err) {
        return Promise.reject(err);
    }
};

const handleConversationAdd = async (convo: Conversation, userId: string) => {
    try {
        const user = await getUser(userId);
        const previews = user.conversations.filter((c) => c.cid !== convo.id).map((p) => cleanUndefinedFields(p));
        const newPreview = cleanUndefinedFields({
            cid: convo.id,
            name: convo.name,
            unSeenMesages: 0,
            avatar: convo.avatar,
            lastMessageTime: new Date(),
            publicKey: convo.publicKey
        });
        usersCol.doc(userId).update({
            conversations: [newPreview, ...previews]
        });
    } catch (err) {
        return Promise.reject(err);
    }
};

const addIdToContacts = async (contactId: string, uid: string) => {
    try {
        const currUser = await getUser(uid);
        if (currUser.contacts && currUser.contacts.includes(contactId)) {
            return;
        }
        const updateRes = await usersCol.doc(uid).update({
            contacts: FieldValue.arrayUnion(contactId)
        });
        return updateRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const addIdArrToContacts = async (newContactIds: string[], uid: string) => {
    try {
        const currUser = await getUser(uid);
        let filteredNewContactIds = newContactIds.filter((c) => c !== uid);
        if (currUser.contacts) {
            filteredNewContactIds = newContactIds
                .filter((c) => c !== uid && !currUser.contacts?.includes(c))
                .map((c) => cleanUndefinedFields(c));
        }
        if (filteredNewContactIds.length > 0) {
            const updateRes = await usersCol.doc(uid).update({
                contacts: FieldValue.arrayUnion(...filteredNewContactIds)
            });
            return updateRes;
        }
        return undefined;
    } catch (err) {
        return Promise.reject(err);
    }
};

const addConvoToArchive = async (convoId: string, uid: string) => {
    try {
        const currUser = await getUser(uid);
        if (currUser.archivedConvos && currUser.archivedConvos.includes(convoId)) return;
        const updateRes = await usersCol.doc(uid).update({
            archivedConvos: FieldValue.arrayUnion(convoId)
        });
        return updateRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const removeConvoFromArchive = async (convoId: string, uid: string) => {
    try {
        const currUser = await getUser(uid);
        if (currUser.archivedConvos && currUser.archivedConvos.includes(convoId)) {
            const updateRes = await usersCol.doc(uid).update({
                archivedConvos: currUser.archivedConvos.filter((c) => c !== convoId)
            });
            return updateRes;
        }
        return undefined;
    } catch (err) {
        return Promise.reject(err);
    }
};

const setUserPublicKey = async (uid: string, publicKey: string) => {
    try {
        const updateRes = await usersCol.doc(uid).update({
            publicKey
        });
        return updateRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const updatePreviewRole = async (uid: string, cid: string, newRole: ChatRole) => {
    try {
        const user = await getUser(uid);
        const updatedPreviews = user.conversations.map((c) => {
            if (c.cid === cid) {
                return cleanUndefinedFields({
                    ...c,
                    userRole: newRole
                });
            }
            return cleanUndefinedFields(c);
        });
        if (updatePreviewDetails.length === 0) return;
        const updateRes = await usersCol.doc(uid).update(
            cleanUndefinedFields({
                conversations: updatedPreviews
            })
        );
        return updateRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const updateConversationsForNewUserDetails = async (userData: UserData) => {
    try {
        const updateBatch = db.batch();
        await Promise.all(
            userData.conversations.map(async (c) => {
                const convoDoc = await conversationsCol.doc(c.cid).get();
                const convo = parseDBConvo(convoDoc.data());
                const existingProfile = convo.participants.find((p) => p.id === userData.id);
                if (existingProfile && !existingProfile.customProfile) {
                    const newProfile = {
                        ...existingProfile,
                        avatar: userData.avatar || existingProfile.avatar,
                        displayName: userData.displayName || existingProfile.displayName
                    } as UserConversationProfile;
                    const updatedParticipants = convo.participants.map((p) => {
                        if (p.id === userData.id) return cleanUndefinedFields(newProfile);
                        return cleanUndefinedFields(p);
                    });
                    updateBatch.update(convoDoc.ref, {
                        participants: updatedParticipants
                    });
                }

                if (!c.group) {
                    const recipientProfile = convo.participants.find((p) => p.id !== userData.id);
                    if (recipientProfile) {
                        const recipientDoc = await usersCol.doc(recipientProfile.id).get();
                        const recipientData = parseDBUserData(recipientDoc.data() as DBUserData);
                        if (!recipientData) return;
                        const existingPreview = recipientData.conversations.find((rc) => rc.cid === c.cid);
                        if (existingPreview) {
                            const updatedPreview = {
                                ...existingPreview,
                                name: userData.displayName || userData.handle || existingPreview.name,
                                avatar: userData.avatar || existingPreview?.name
                            };
                            updateBatch.update(recipientDoc.ref, {
                                conversations: recipientData.conversations.map((rc) => {
                                    if (rc.cid === c.cid) {
                                        return cleanUndefinedFields(updatedPreview);
                                    }
                                    return cleanUndefinedFields(rc);
                                })
                            });
                        }
                    }
                }
            })
        );
        await updateBatch.commit();
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

const usersService = {
    getUser,
    getMultipleUsers,
    createNewUser,
    updateUser,
    getSocketUser,
    handleReadReceipt,
    updatePushNotificationTokens,
    updatePreviewDetails,
    handleLeaveConversation,
    handleConversationAdd,
    addIdToContacts,
    addConvoToArchive,
    addIdArrToContacts,
    removeConvoFromArchive,
    setUserPublicKey,
    updatePreviewRole,
    updateConversationsForNewUserDetails
};

export default usersService;
