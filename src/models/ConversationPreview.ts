import { Timestamp } from 'firebase-admin/firestore';
import AvatarImage from './AvatarImage';

export type DBConversationPreview = {
    cid: string;
    name: string;
    lastMessageContent?: string;
    unSeenMessages: number;
    avatar?: AvatarImage;
    lastMessageTime: Timestamp;
};

type ConversationPreview = {
    cid: string;
    name: string;
    lastMessageContent?: string;
    unSeenMessages: number;
    avatar?: AvatarImage;
    lastMessageTime: Date;
};

export default ConversationPreview;
