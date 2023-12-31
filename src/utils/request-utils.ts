import { DocumentData, Query } from 'firebase-admin/firestore';
import {
    DBMessage,
    Message,
    RawMessage,
    DBUserData,
    UserData,
    DBConversationPreview,
    CalendarEvent,
    Poll,
    RawCalendarEvent,
    RawPoll,
    ScheduledMessage
} from '../models';
import { DBCalendarEvent, DBPoll } from 'models/MessageObjects';

export const cleanUndefinedFields = (obj: any) => {
    if (!obj) return obj;
    return Object.fromEntries(Object.entries(obj).filter(([k, v]) => v !== undefined)) as any;
};

export const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return String(error);
};

export const parseRequestMessage = (message: any): Message => {
    if (typeof message.timestamp === 'string') {
        return {
            ...message,
            delivered: true,
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

export const parseDBSCMessage = (message: any): ScheduledMessage => {
    if (!message.time || !message.time.toDate) return message as ScheduledMessage;
    return {
        ...message,
        time: message.time.toDate()
    } as ScheduledMessage;
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

export const chunk = <T>(arr: T[], chunkSize: number) => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        const arrChunk = arr.slice(i, i + chunkSize);
        chunks.push(arrChunk);
    }
    return chunks;
};

export const parseEvent = (rawEvent: RawCalendarEvent) => {
    try {
        const parsedDate = new Date(Date.parse(rawEvent.date));
        const parsedReminders = rawEvent.reminders.map((r) => new Date(Date.parse(r)));
        return {
            ...rawEvent,
            date: parsedDate,
            reminders: parsedReminders
        };
    } catch (err) {
        return rawEvent as any;
    }
};

export const parseDBEvent = (dbEvent: DBCalendarEvent) => {
    try {
        const parsedDate = dbEvent.date.toDate();
        const parsedReminders = dbEvent.reminders.map((r) => r.toDate());
        return {
            ...dbEvent,
            date: parsedDate,
            reminders: parsedReminders
        };
    } catch (err) {
        return dbEvent as any;
    }
};

export const parseDBPoll = (dbPoll: DBPoll) => {
    try {
        const parsedDate = dbPoll.expirationDate.toDate();
        return {
            ...dbPoll,
            expirationDate: parsedDate
        } as Poll;
    } catch (err) {
        return dbPoll as any;
    }
};
