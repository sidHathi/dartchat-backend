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
};

export type CalendarEvent = {
    id: string;
    name: string;
    date: Date;
    reminders: Date[];
    going: string[];
    notGoing: string[];
};

export type ObjectRef = {
    type: string;
    id: string;
};
