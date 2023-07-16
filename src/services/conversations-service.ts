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
    NotificationStatus
} from '../models';
import { cleanUndefinedFields } from '../utils/request-utils';
import { FieldValue } from 'firebase-admin/firestore';
import usersService from './users-service';
import { MessageCursor, getQueryForCursor } from '../pagination';
import { parseDBMessage } from '../utils/request-utils';
import { cleanConversation, getUserConversationAvatar } from '../utils/conversation-utils';

const usersCol = db.collection('users');
const conversationsCol = db.collection('conversations');

const createNewConversation = async (newConversation: Conversation) => {
    try {
        await conversationsCol.doc(newConversation.id).set(cleanConversation(newConversation));
        conversationsCol.doc(newConversation.id).collection('messages');
        await addUsersToNewConversation(newConversation);
        return newConversation;
    } catch (err) {
        return Promise.reject(err);
    }
};

const getConversationInfo = async (cid: string): Promise<Conversation | never> => {
    try {
        const convo = await conversationsCol.doc(cid).get();
        return cleanConversation(convo.data() as Conversation);
    } catch (err) {
        return Promise.reject(err);
    }
};

const addUsersToNewConversation = async (newConversation: Conversation) => {
    try {
        const previewsForUsers: { [id: string]: ConversationPreview } = {};
        newConversation.participants.map((participant) => {
            const preview: any = {
                cid: newConversation.id,
                unSeenMessages: 0,
                lastMessageTime: new Date(),
                avatar: getUserConversationAvatar(newConversation, participant.id)
            };
            if (!newConversation.group) {
                preview.name = newConversation.participants.filter((p) => p.id !== participant.id)[0].displayName;
                console.log(preview);
                console.log(participant);
            } else {
                preview.name = newConversation.name;
            }
            previewsForUsers[participant.id] = preview;
        });
        Object.entries(previewsForUsers).map(([id, preview]) =>
            usersCol.doc(id).update({
                conversations: FieldValue.arrayUnion(preview)
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
        // messages.reverse();
        if (convoRes.exists) {
            const rawConvo = convoRes.data() as Conversation;
            rawConvo.messages = messages;
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
                    conversations: currentUser.conversations.filter((c) => c.cid !== cid)
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
        const newParticipants = [...convo.participants.filter((p) => p.id !== newProfile.id), newProfile];
        const res = await conversationsCol.doc(cid).update({
            participants: newParticipants
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
        const res = await conversationsCol.doc(cid).update(udpates);
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
            const convo = cleanConversation(convoDoc.data() as Conversation);
            const res = await Promise.all(
                convo.participants.map(async (p) => {
                    await usersService.updatePreviewDetails(convo, p.id);
                })
            );
            return res;
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
        const res = await conversationsCol.doc(cid).update({
            participants: FieldValue.arrayUnion(...profiles)
        });
        if (res) {
            const updatedConvo = await getConversationInfo(cid);
            await Promise.all(
                profiles.map(async (profile) => {
                    await usersService.handleConversationAdd(updatedConvo, profile.id);
                })
            );
        }
        return res;
    } catch (err) {
        return Promise.reject(err);
    }
};

const removeUser = async (cid: string, uid: string) => {
    try {
        const convo = await getConversationInfo(cid);
        const updatedParticipants = convo.participants.filter((p) => p.id !== uid);
        const res = await conversationsCol.doc(cid).update({
            participants: updatedParticipants
        });
        if (res) {
            await usersService.handleLeaveConversation(cid, uid);
        }
        return res;
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
    removeUser
};

export default conversationsService;
