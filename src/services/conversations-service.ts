import { db } from '../firebase';
import { Conversation, ConversationPreview, Message, UserData, UserProfile } from '../models';
import { cleanUndefinedFields } from '../utils';
import { FieldValue } from 'firebase-admin/firestore';
import usersService from './users-service';
import { v4 as uuid } from 'uuid';

const usersCol = db.collection('users');
const conversationsCol = db.collection('conversations');

const createNewConversation = async (newConversation: Conversation) => {
    try {
        conversationsCol.doc(newConversation.id).set(cleanUndefinedFields(newConversation));
        addUsersToNewConversation(newConversation);
        return newConversation;
    } catch (err) {
        return Promise.reject(err);
    }
};

const addUsersToNewConversation = async (newConversation: Conversation) => {
    try {
        const preview: ConversationPreview = {
            cid: newConversation.id,
            name: newConversation.name,
            unSeenMessages: 0,
            lastMessageTime: new Date().toString()
        };
        newConversation.participants.map((participant) => {
            usersCol.doc(participant.id).update({
                conversations: FieldValue.arrayUnion(preview)
            });
        });
    } catch (err) {
        return Promise.reject(err);
    }
};

const generateConversationInitMessage = async (newConversation: Conversation, userId: string) => {
    const timestamp = new Date();
    const messageType = 'system';
    const encryptionLevel = 'none';
    try {
        const userProfile: UserProfile = newConversation.participants.filter((p) => p.id === userId)[0];
        const content = `Chat created by ${userProfile.displayName}`;
        const newMessage: Message = {
            timestamp,
            messageType,
            encryptionLevel,
            content,
            senderId: 'system',
            id: uuid(),
            likes: []
        };
        return newMessage;
    } catch (err) {
        return Promise.reject(err);
    }
};

const storeNewMessage = async (cid: string, message: Message) => {
    try {
        const convoDoc = await conversationsCol.doc(cid).get();
        const res = await conversationsCol.doc(cid).update({
            messages: FieldValue.arrayUnion(message)
        });
        const convo = convoDoc.data() as Conversation;
        if (!convo) return Promise.reject('no such conversation');
        const participants = convo.participants;
        participants.map(async (participant) => {
            const userDoc = await usersCol.doc(participant.id).get();
            if (userDoc.exists) {
                const user = userDoc.data() as UserData;
                let unSeenMessages = 0;
                const matchingConvos = user.conversations.filter((c) => c.cid === cid);
                if (matchingConvos.length > 0) {
                    unSeenMessages = matchingConvos[0].unSeenMessages;
                }
                usersCol.doc(participant.id).update({
                    conversations: [
                        ...user.conversations.filter((c) => c.cid !== cid),
                        {
                            cid: convo.id,
                            name: convo.name,
                            unSeenMessages: unSeenMessages + 1,
                            lastMessageTime: message.timestamp,
                            lastMessageContent: message.content
                        }
                    ]
                });
            }
        });
        return res;
    } catch (err) {
        return Promise.reject(err);
    }
};

const getConversation = async (cid: string) => {
    try {
        const convo = (await conversationsCol.doc(cid).get()).data() as Conversation;
        return convo;
    } catch (err) {
        return Promise.reject(err);
    }
};

const storeNewLike = async (cid: string, mid: string, uid: string) => {
    try {
        const convo = (await conversationsCol.doc(cid).get()).data() as Conversation;
        const messages = convo.messages;
        const matchingMessages = messages.filter((m) => m.id === mid);
        if (matchingMessages.length > 0) {
            const message = matchingMessages[0];
            const likedMessage = {
                ...message,
                likes: [...message.likes, uid]
            };
            const newMessageHistory = [...messages.filter((m) => m.id !== mid), likedMessage].sort(
                (m1, m2) => m1.timestamp.getTime() - m2.timestamp.getTime()
            );
            return await conversationsCol.doc(cid).update({
                ...convo,
                messages: newMessageHistory
            });
        }
        return Promise.reject('no such message');
    } catch (err) {
        return Promise.reject(err);
    }
};

const deleteConversation = async (cid: string, userId: string) => {
    try {
        console.log('deleting conversation');
        const convo = (await conversationsCol.doc(cid).get()).data() as Conversation;
        if (!convo) {
            const currentUser = await usersService.getCurrentUser(userId);
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
        const delRes = await conversationsCol.doc(cid).delete();
        return delRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const conversationsService = {
    createNewConversation,
    addUsersToNewConversation,
    generateConversationInitMessage,
    storeNewMessage,
    getConversation,
    deleteConversation,
    storeNewLike
};

export default conversationsService;
