import { Timestamp } from 'firebase-admin/firestore';
import { MessageMedia } from './Message';

export type Poll = {
    id: string;
    multiChoice: boolean;
    question: string;
    media?: MessageMedia[];
    options: {
        idx: number;
        value: string;
        voters: string[];
    }[];
    expirationDate: Date;
    messageId?: string;
    messageLink?: string;
};

export type RawPoll = {
    id: string;
    multiChoice: boolean;
    question: string;
    media?: MessageMedia[];
    options: {
        idx: number;
        value: string;
        voters: string[];
    }[];
    expirationDate: string;
    messageId?: string;
    messageLink?: string;
};

export type DBPoll = {
    id: string;
    multiChoice: boolean;
    question: string;
    media?: MessageMedia[];
    options: {
        idx: number;
        value: string;
        voters: string[];
    }[];
    expirationDate: Timestamp;
    messageId?: string;
    messageLink?: string;
};

export type CalendarEvent = {
    id: string;
    name: string;
    date: Date;
    reminders: Date[];
    going: string[];
    notGoing: string[];
    messageLink?: string;
};

export type RawCalendarEvent = {
    id: string;
    name: string;
    date: string;
    reminders: string[];
    going: string[];
    notGoing: string[];
    messageLink?: string;
};

export type DBCalendarEvent = {
    id: string;
    name: string;
    date: Timestamp;
    reminders: Timestamp[];
    going: string[];
    notGoing: string[];
    messageLink?: string;
};

export type ObjectRef = {
    type: string;
    id: string;
};

export type LikeIcon = {
    type: 'none' | 'icon' | 'img';
    emptyImageUri?: string;
    partialImageUri?: string;
    activeImageUri?: string;
    iconName?: string;
};
