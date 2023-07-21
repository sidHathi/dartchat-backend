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

export type Event = {
    id: string;
    name: string;
    date: Date;
};

export type ObjectRef = {
    type: string;
    id: string;
};
