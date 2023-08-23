import { db } from '../firebase';
import {
    Conversation,
    ConversationPreview,
    Message,
    UserData,
    UserProfile,
    DBMessage,
    AvatarImage,
    UserConversationProfile,
    NotificationStatus,
    Poll,
    CalendarEvent,
    LikeIcon,
    ChatRole
} from '../models';
import { chunk, cleanUndefinedFields } from '../utils/request-utils';
import { FieldValue } from 'firebase-admin/firestore';
import usersService from './users-service';
import { MessageCursor, getQueryForCursor } from '../pagination';
import { parseDBMessage } from '../utils/request-utils';
import {
    cleanConversation,
    getUserConversationAvatar,
    hasPermissionForAction,
    parseDBConvo
} from '../utils/conversation-utils';
import messagesService from './messages-service';
import secretsService from './secrets-service';

const usersCol = db.collection('users');
const conversationsCol = db.collection('conversations');

const createNewConversation = async (
    newConversation: Conversation,
    uid: string,
    userKeyMap?: { [key: string]: string }
) => {
    try {
        await conversationsCol.doc(newConversation.id).set(cleanConversation(newConversation));
        conversationsCol.doc(newConversation.id).collection('messages');
        await addUsersToNewConversation(newConversation);
        if (userKeyMap && newConversation.publicKey) {
            await secretsService.addUserSecretsForNewConversation(newConversation, uid, userKeyMap);
        }
        return newConversation;
    } catch (err) {
        return Promise.reject(err);
    }
};

const getConversationInfo = async (cid: string): Promise<Conversation | never> => {
    try {
        const convoDoc = await conversationsCol.doc(cid).get();
        const convo = parseDBConvo(convoDoc.data() as Conversation);
        if (!convo) return Promise.reject('no such convo');
        if (!convo.keyInfo) {
            convo.keyInfo = await secretsService.addKeyInfo(convo);
        }
        return convo;
    } catch (err) {
        return Promise.reject(err);
    }
};

const addUsersToNewConversation = async (newConversation: Conversation) => {
    try {
        const pids = newConversation.participants.map((p) => p.id);
        const previewsForUsers: { [id: string]: ConversationPreview } = {};
        newConversation.participants.map((participant) => {
            const preview: any = {
                cid: newConversation.id,
                unSeenMessages: 0,
                lastMessageTime: new Date(),
                avatar: getUserConversationAvatar(newConversation, participant.id),
                group: newConversation.group,
                publicKey: newConversation.publicKey,
                userRole: participant.role
            };
            if (!newConversation.group) {
                const otherParticipant = newConversation.participants.filter((p) => p.id !== participant.id)[0];
                preview.name = otherParticipant.displayName;
                preview.recipientId = otherParticipant.id;
            } else {
                preview.name = newConversation.name;
            }
            previewsForUsers[participant.id] = preview;
        });
        await Promise.all(
            Object.entries(previewsForUsers).map(async ([id, preview]) => {
                await usersCol.doc(id).update({
                    conversations: FieldValue.arrayUnion(cleanUndefinedFields(preview))
                });
                await usersService.addIdArrToContacts(pids, id);
            })
        );
    } catch (err) {
        return Promise.reject(err);
    }
};

const getConversation = async (cid: string, messageCursor: MessageCursor) => {
    try {
        const convoRes = await conversationsCol.doc(cid).get();
        const messageColRef = conversationsCol.doc(cid).collection('messages');
        const messageDocs = await getQueryForCursor(messageColRef, messageCursor).get();
        const messages: Message[] = [];
        messageDocs.forEach((md) => {
            messages.push(parseDBMessage(md.data() as DBMessage));
        });
        if (convoRes.exists) {
            const rawConvo = parseDBConvo(convoRes.data() as Conversation);
            rawConvo.messages = messages;
            if (!rawConvo.keyInfo) {
                rawConvo.keyInfo = await secretsService.addKeyInfo(rawConvo);
            }
            return rawConvo;
        }
        return null;
    } catch (err) {
        return Promise.reject(err);
    }
};

const conversationExists = async (cid: string) => {
    try {
        const convoDoc = await conversationsCol.doc(cid).get();
        return convoDoc.exists;
    } catch (err) {
        console.log(err);
        return false;
    }
};

const deleteConversation = async (cid: string, userId: string) => {
    try {
        console.log('deleting conversation');
        const convo = (await conversationsCol.doc(cid).get()).data() as Conversation;
        if (!convo) {
            const currentUser = await usersService.getUser(userId);
            if (currentUser && currentUser.conversations) {
                const res = await usersService.updateUser(userId, {
                    ...currentUser,
                    conversations: currentUser.conversations.filter((c) => c.cid !== cid) || []
                });
                return res;
            }
        }
        convo.participants.map(async (p) => {
            const user = (await usersCol.doc(p.id).get()).data() as UserData;
            if (!user.conversations) return;
            const prev = user.conversations.filter((c) => c.cid === cid);
            if (prev.length > 0) {
                await usersCol.doc(p.id).update({
                    conversations: FieldValue.arrayRemove(prev[0])
                });
            }
        });
        const messageDocs = await conversationsCol.doc(cid).collection('messages').get();
        const batch = db.batch();
        messageDocs.forEach((md) => {
            batch.delete(md.ref);
        });
        await batch.commit();
        const delRes = await conversationsCol.doc(cid).delete();
        return delRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const updateConversationProfile = async (cid: string, newProfile: UserProfile) => {
    try {
        const convo = await getConversationInfo(cid);
        const newParticipants = [
            ...convo.participants.filter((p) => p.id !== newProfile.id).map((p) => cleanUndefinedFields(p)),
            cleanUndefinedFields({
                ...newProfile,
                customProfile: true
            })
        ];
        const res = await conversationsCol.doc(cid).update({
            participants: cleanUndefinedFields(newParticipants)
        });
        return res;
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

const updateConversationDetails = async (
    cid: string,
    newDetails: {
        newName: string;
        newAvatar: AvatarImage;
    }
) => {
    try {
        const udpates = cleanUndefinedFields({
            name: newDetails.newName,
            avatar: newDetails.newAvatar
        });
        const res = await conversationsCol.doc(cid).update(cleanUndefinedFields(udpates));
        if (res) {
            await updateConversationPreviews(cid);
            return res;
        } else {
            return Promise.reject('update failed');
        }
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

const updateConversationPreviews = async (cid: string) => {
    try {
        const convoDoc = await conversationsCol.doc(cid).get();
        if (convoDoc.exists) {
            const convo = parseDBConvo(convoDoc.data() as Conversation);
            console.log(convo);
            if (!convo.participants) return;
            convo.participants.map(async (p: any) => usersService.updatePreviewDetails(convo, p.id));
            return true;
        }
        return Promise.reject('no such conversation');
    } catch (err) {
        return Promise.reject(err);
    }
};

const updateUserNotStatus = async (cid: string, uid: string, newStatus: NotificationStatus) => {
    try {
        const convo = await getConversationInfo(cid);
        const matches = convo.participants.filter((p) => p.id === uid);
        if (matches.length > 0) {
            const updatedProfile = {
                ...matches[0],
                notifications: newStatus
            };
            const updatedProfilesList = [updatedProfile, ...convo.participants.filter((p) => p.id !== uid)];
            const res = conversationsCol.doc(convo.id).update({
                participants: updatedProfilesList
            });
            return res;
        }
        return Promise.reject('no such profile in conversation');
    } catch (err) {
        return Promise.reject(err);
    }
};

const addUsers = async (cid: string, profiles: UserConversationProfile[]) => {
    try {
        const initialConvo = await getConversationInfo(cid);
        const correctlyPermissionedProfiles = profiles.map((p) => {
            const isAdmin = initialConvo.adminIds?.includes(p.id);
            if (p.role === 'admin' && !isAdmin) {
                return cleanUndefinedFields({
                    ...p,
                    role: 'plebian'
                }) as UserConversationProfile;
            } else if (p.role !== 'admin' && isAdmin) {
                return cleanUndefinedFields({
                    ...p,
                    role: 'admin'
                }) as UserConversationProfile;
            }
            return cleanUndefinedFields(p) as UserConversationProfile;
        });
        const res = await conversationsCol.doc(cid).update({
            participants: FieldValue.arrayUnion(...correctlyPermissionedProfiles)
        });
        if (res) {
            const updatedConvo = await getConversationInfo(cid);
            const pids = updatedConvo.participants.map((p) => p.id);
            await Promise.all(
                correctlyPermissionedProfiles.map(async (profile) => {
                    await usersService.handleConversationAdd(updatedConvo, profile.id);
                    await usersService.addIdArrToContacts(pids, profile.id);
                    await usersService.removeConvoFromArchive(cid, profile.id);
                })
            );
        }
        return res;
    } catch (err) {
        return Promise.reject(err);
    }
};

const removeUser = async (cid: string, actorId: string, uid: string, archive: boolean) => {
    try {
        const convo = await getConversationInfo(cid);
        const actorRole = convo.participants.find((p) => p.id === actorId)?.role;
        const recipientRole = convo.participants.find((p) => p.id === uid)?.role;
        if (!hasPermissionForAction('removeUser', actorRole, recipientRole)) return;
        const updatedParticipants = convo.participants.filter((p) => p.id !== uid).map((p) => cleanUndefinedFields(p));
        const res = await conversationsCol.doc(cid).update({
            participants: updatedParticipants || []
        });
        if (res) {
            await usersService.handleLeaveConversation(cid, uid);
            if (archive) {
                await usersService.addConvoToArchive(cid, uid);
            }
        }
        return res;
    } catch (err) {
        return Promise.reject(err);
    }
};

const addPoll = async (cid: string, poll: Poll) => {
    try {
        const res = await conversationsCol.doc(cid).update({
            polls: FieldValue.arrayUnion(poll)
        });
        if (res) return res;
        return Promise.reject('update failed');
    } catch (err) {
        return Promise.reject(err);
    }
};

const recordPollResponse = async (cid: string, uid: string, pid: string, selectedOptionIndices: number[]) => {
    try {
        const convo = await getConversationInfo(cid);
        const updateRes = await messagesService.recordPollResponse(convo, uid, pid, selectedOptionIndices);
        if (updateRes) {
            return updateRes;
        }
        return Promise.reject('update failed');
    } catch (err) {
        return Promise.reject(err);
    }
};

const getPoll = async (cid: string, pid: string) => {
    try {
        const convo = await getConversationInfo(cid);
        if (convo.polls) {
            const matches = convo.polls.filter((poll) => poll.id === pid);
            if (matches.length > 0) {
                return matches[0];
            }
        }
        return Promise.reject('poll not found');
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

const addEvent = async (cid: string, event: CalendarEvent) => {
    try {
        const res = await conversationsCol.doc(cid).update({
            events: FieldValue.arrayUnion(event)
        });
        if (res) return res;
        return Promise.reject('update failed');
    } catch (err) {
        return Promise.reject(err);
    }
};

const recordEventRsvp = async (cid: string, eid: string, uid: string, response: string) => {
    try {
        const convo = await getConversationInfo(cid);
        const updateRes = await messagesService.recordEventRsvp(convo, eid, uid, response);
        return updateRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const getEvent = async (cid: string, eid: string) => {
    try {
        const convo = await getConversationInfo(cid);
        if (!convo.events) return Promise.reject('no such event');
        const matches = convo.events.filter((e) => e.id === eid);
        if (matches.length < 1) return Promise.reject('no such event');
        return matches[0];
    } catch (err) {
        return Promise.reject(err);
    }
};

const changeLikeIcon = async (cid: string, newLikeIcon: LikeIcon) => {
    try {
        const updateRes = await conversationsCol.doc(cid).update({
            customLikeIcon: newLikeIcon
        });
        return updateRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const resetLikeIcon = async (cid: string) => {
    try {
        const updateRes = await conversationsCol.doc(cid).update({
            customLikeIcon: FieldValue.delete()
        });
        return updateRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const getConversationsInfo = async (cids: string[]) => {
    try {
        if (cids.length < 1) return undefined;
        const batchedCids = chunk<string>(cids, 10);
        const conversations: Conversation[] = [];
        await Promise.all(
            batchedCids.map(async (batch) => {
                const conversationDocs = await conversationsCol.where('id', 'in', batch).get();
                conversationDocs.forEach((c) => conversations.push(cleanConversation(c.data() as Conversation)));
            })
        );
        return conversations;
    } catch (err) {
        return Promise.reject(err);
    }
};

const changeConversationUserRole = async (cid: string, actorId: string, uid: string, newRole: ChatRole) => {
    try {
        const convo = await getConversationInfo(cid);
        if (!convo) return;
        const actorRole = convo.participants.find((p) => p.id === actorId)?.role;
        const recipientRole = convo.participants.find((p) => p.id === uid)?.role;
        if (!hasPermissionForAction('changeUserRole', actorRole, recipientRole)) return;
        const newParticipants = convo.participants.map((p) => {
            if (p.id === uid) {
                return {
                    ...p,
                    role: newRole
                } as UserConversationProfile;
            }
            return p;
        });
        if (newParticipants.length === 0) return;
        let newAdminList = convo.adminIds || [];
        if (newRole === 'admin') {
            newAdminList = [...newAdminList, uid];
        } else {
            newAdminList = newAdminList.filter((id) => id !== uid);
        }
        const updateRes = await conversationsCol.doc(cid).update({
            participants: newParticipants || [],
            adminIds: newAdminList || []
        });
        return updateRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const conversationsService = {
    createNewConversation,
    getConversationInfo,
    addUsersToNewConversation,
    getConversation,
    conversationExists,
    deleteConversation,
    updateConversationProfile,
    updateConversationDetails,
    updateConversationPreviews,
    updateUserNotStatus,
    addUsers,
    removeUser,
    addPoll,
    recordPollResponse,
    getPoll,
    addEvent,
    recordEventRsvp,
    getEvent,
    changeLikeIcon,
    resetLikeIcon,
    getConversationsInfo,
    changeConversationUserRole
};

export default conversationsService;
