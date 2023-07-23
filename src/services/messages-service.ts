import { db } from '../firebase';
import { Conversation, Message, UserConversationProfile, UserData, AvatarImage, DBMessage } from '../models';
import { parseRequestMessage, parseDBMessage } from '../utils/request-utils';
import { getQueryForCursor, MessageCursor } from '../pagination';
import { v4 as uuid } from 'uuid';

const conversationsCol = db.collection('conversations');
const usersCol = db.collection('users');

const generateConversationInitMessage = async (newConversation: Conversation, userId: string) => {
    const timestamp = new Date();
    const messageType = 'system';
    const encryptionLevel = 'none';
    try {
        const userProfile: UserConversationProfile = newConversation.participants.filter((p) => p.id === userId)[0];
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
    group: boolean,
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
            let name = cName;
            if (matchingConvos.length > 0) {
                unSeenMessages = matchingConvos[0].unSeenMessages;
                avatar = matchingConvos[0].avatar;
            }
            if (!group) {
                name = user.conversations.filter((c) => c.cid === cid)[0].name;
            }
            usersCol.doc(id).update({
                conversations: [
                    ...user.conversations.filter((c) => c.cid !== cid),
                    {
                        cid: cid,
                        name,
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
        await handleUserConversationMessage(convo.id, convo.name, convo.group, participantIds, parsedMessage);
        return res;
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
            await conversationsCol.doc(cid).collection('messages').doc(mid).update({ likes: updatedLikes });
            return message;
        }
        return Promise.reject('no such message');
    } catch (err) {
        return Promise.reject(err);
    }
};

const recordPollResponse = async (convo: Conversation, uid: string, pid: string, selectedOptionIndices: number[]) => {
    try {
        if (!convo.polls) return Promise.reject('no such poll');

        const updatedPolls = convo.polls.map((poll) => {
            if (poll.id === pid) {
                return {
                    ...poll,
                    options: poll.options.map((opt) => {
                        if (selectedOptionIndices.includes(opt.idx)) {
                            return {
                                ...opt,
                                voters: [...opt.voters, uid]
                            };
                        }
                        return opt;
                    })
                };
            }
            return poll;
        });
        const updateRes = await conversationsCol.doc(convo.id).update({
            polls: updatedPolls
        });
        if (updateRes) {
            return updateRes;
        }
        return Promise.reject('update failed');
    } catch (err) {
        return Promise.reject(err);
    }
};

const recordEventRsvp = async (convo: Conversation, eid: string, uid: string, response: string) => {
    try {
        if (!convo.events) return Promise.reject('no such event');
        const newEventsArr = convo.events.map((e) => {
            if (e.id === eid) {
                const clearedEvent = {
                    ...e,
                    notGoing: e.notGoing.filter((p) => p !== uid),
                    going: e.going.filter((p) => p !== uid)
                };
                if (response === 'going') {
                    if (e.going.includes(uid)) return clearedEvent;
                    return {
                        ...e,
                        going: [...e.going.filter((p) => p !== uid), uid],
                        notGoing: e.notGoing.filter((p) => p !== uid)
                    };
                } else if (response === 'notGoing') {
                    if (e.notGoing.includes(uid)) return clearedEvent;
                    return {
                        ...e,
                        notGoing: [...e.notGoing.filter((p) => p !== uid), uid],
                        going: e.going.filter((p) => p !== uid)
                    };
                } else {
                    return clearedEvent;
                }
            }
            return e;
        });
        const updateRes = await conversationsCol.doc(convo.id).update({
            events: newEventsArr
        });
        return updateRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const messagesService = {
    generateConversationInitMessage,
    handleUserConversationMessage,
    storeNewMessage,
    getConversationMessages,
    getConversationMessagesToDate,
    getConversationMessage,
    storeNewLike,
    recordPollResponse,
    recordEventRsvp
};

export default messagesService;