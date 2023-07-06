import { db } from '../firebase';
import {
    Conversation,
    ConversationPreview,
    Message,
    RawMessage,
    UserData,
    UserProfile,
    DBMessage,
    AvatarImage
} from '../models';
import { cleanUndefinedFields } from '../utils/request-utils';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import usersService from './users-service';
import { v4 as uuid } from 'uuid';
import { MessageCursor, getQueryForCursor } from '../pagination';
import { parseDBMessage, parseRequestMessage } from '../utils/request-utils';
import { cleanConversation, getUserConversationAvatar } from '../utils/conversation-utils';

const usersCol = db.collection('users');
const conversationsCol = db.collection('conversations');

const createNewConversation = async (newConversation: Conversation) => {
    try {
        await conversationsCol.doc(newConversation.id).set(cleanConversation(newConversation));
        await conversationsCol.doc(newConversation.id).collection('messages');
        await addUsersToNewConversation(newConversation);
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
            lastMessageTime: new Date()
        };
        newConversation.participants.map(async (participant) => {
            await usersCol.doc(participant.id).update({
                conversations: FieldValue.arrayUnion({
                    ...preview,
                    avatar: getUserConversationAvatar(newConversation, participant.id)
                })
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

const handleUserConversationMessage = async (
    cid: string,
    cName: string,
    participantIds: string[],
    message: Message
) => {
    participantIds.map(async (id) => {
        const userDoc = await usersCol.doc(id).get();
        if (userDoc.exists) {
            const user = userDoc.data() as UserData;
            let unSeenMessages = 0;
            const matchingConvos = user.conversations.filter((c) => c.cid === cid);
            let avatar: AvatarImage | undefined = undefined;
            if (matchingConvos.length > 0) {
                unSeenMessages = matchingConvos[0].unSeenMessages;
                avatar = matchingConvos[0].avatar;
            }
            usersCol.doc(id).update({
                conversations: [
                    ...user.conversations.filter((c) => c.cid !== cid),
                    {
                        cid: cid,
                        name: cName,
                        avatar,
                        unSeenMessages: id === message.senderId ? 0 : unSeenMessages + 1,
                        lastMessageTime: message.timestamp,
                        lastMessageContent: message.content
                    }
                ]
            });
        }
    });
};

const storeNewMessage = async (cid: string, message: Message) => {
    try {
        const convoDoc = await conversationsCol.doc(cid).get();
        const parsedMessage = parseRequestMessage(message);
        const messageDoc = conversationsCol.doc(cid).collection('messages').doc(message.id);
        const res = await messageDoc.set(parsedMessage);
        const convo = convoDoc.data() as Conversation;
        if (!convo) return Promise.reject('no such conversation');
        const participantIds = convo.participants.map((p) => p.id);
        await handleUserConversationMessage(convo.id, convo.name, participantIds, parsedMessage);
        return res;
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

const getConversationMessages = async (cid: string, messageCursor: MessageCursor) => {
    try {
        const messageColRef = conversationsCol.doc(cid).collection('messages');
        const messageDocs = await getQueryForCursor(messageColRef, messageCursor).get();
        const messages: Message[] = [];
        messageDocs.forEach((md) => {
            messages.push(parseDBMessage(md.data() as DBMessage));
        });
        // messages.reverse();
        return messages;
    } catch (err) {
        return Promise.reject(err);
    }
};

const getConversationMessagesToDate = async (cid: string, messageCursor: MessageCursor, date: Date) => {
    try {
        const messages: Message[] = [];
        const cursor = { ...messageCursor };
        while (messages.length == 0 || messages[messages.length - 1].timestamp.getTime() - date.getTime() > 0) {
            messages.push(...(await getConversationMessages(cid, cursor)));
            cursor.prevLastVal = messages[messages.length - 1].timestamp;
        }
        return messages;
    } catch (err) {
        return Promise.reject(err);
    }
};

const getConversationMessage = async (cid: string, mid: string) => {
    try {
        const message = await conversationsCol.doc(cid).collection('messages').doc(mid).get();
        if (message.exists) {
            return parseDBMessage(message.data() as DBMessage);
        }
        return Promise.reject('no such message');
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

const storeNewLike = async (cid: string, mid: string, uid: string, type: string) => {
    try {
        const messageDoc = await conversationsCol.doc(cid).collection('messages').doc(mid).get();
        if (messageDoc.exists) {
            const message = messageDoc.data() as Message;
            let updatedLikes = message.likes;
            if (type === 'newLike' && !message.likes.includes(uid)) {
                updatedLikes = [...message.likes, uid];
            } else if (type === 'disLike') {
                updatedLikes = message.likes.filter((u) => u !== uid);
            }
            const res = await conversationsCol.doc(cid).collection('messages').doc(mid).update({ likes: updatedLikes });
            return res;
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

const conversationsService = {
    createNewConversation,
    addUsersToNewConversation,
    generateConversationInitMessage,
    storeNewMessage,
    getConversation,
    getConversationMessages,
    getConversationMessage,
    getConversationMessagesToDate,
    conversationExists,
    deleteConversation,
    storeNewLike
};

export default conversationsService;
