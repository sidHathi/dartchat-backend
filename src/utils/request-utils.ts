import {
    DBMessage,
    Message,
    RawMessage,
    DBUserData,
    UserData,
    DBConversationPreview,
    CalendarEvent,
    Poll
} from '../models';

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
    } as Message;
};

export const parseDBUserData = (user: DBUserData): UserData => {
    return {
        ...user,
        conversations: user.conversations
            ? user.conversations.map((c: DBConversationPreview) => ({
                  ...c,
                  lastMessageTime: c.lastMessageTime.toDate(),
                  lastMessage: c.lastMessage ? parseDBMessage(c.lastMessage) : undefined
              }))
            : []
    };
};

export const parseCalEvent = (raw: any): CalendarEvent => {
    return Object.fromEntries(
        Object.entries(raw).map(([key, val]) => {
            if (key === 'date') {
                return [key, new Date(Date.parse(val as string))];
            } else if (key === 'reminders') {
                return [key, (val as string[]).map((s) => new Date(Date.parse(s)))];
            }
            return [key, val];
        })
    ) as CalendarEvent;
};

export const parsePoll = (raw: any): Poll => {
    return Object.fromEntries(
        Object.entries(raw).map(([key, val]) => {
            if (key === 'expirationDate') {
                return [key, new Date(Date.parse(val as string))];
            }
            return [key, val];
        })
    ) as Poll;
};
