import { DBMessage, Message, RawMessage, DBUserData, UserData, DBConversationPreview } from '../models';

export const cleanUndefinedFields = (obj: any) => {
    return Object.keys(obj).reduce((acc: any, key) => {
        const _acc = acc;
        if (obj[key] !== undefined) _acc[key] = obj[key];
        return _acc;
    }, {});
};

export const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return String(error);
};

export const parseRequestMessage = (message: any): Message => {
    if (typeof message.timestamp === 'string') {
        return {
            ...message,
            timestamp: new Date(Date.parse(message.timestamp))
        };
    }
    return message as Message;
};

export const parseDBMessage = (message: DBMessage): Message => {
    return {
        ...message,
        timestamp: message.timestamp.toDate()
    };
};

export const parseDBUserData = (user: DBUserData): UserData => {
    return {
        ...user,
        conversations: user.conversations.map((c: DBConversationPreview) => ({
            ...c,
            lastMessageTime: c.lastMessageTime.toDate()
        }))
    };
};
