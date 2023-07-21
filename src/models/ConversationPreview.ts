import { Timestamp } from 'firebase-admin/firestore';
import AvatarImage from './AvatarImage';

export type DBConversationPreview = {
    cid: string;
    name: string;
    lastMessageContent?: string;
    unSeenMessages: number;
    avatar?: AvatarImage;
    lastMessageTime: Timestamp;
    recipientId?: string;
};

type ConversationPreview = {
    cid: string;
    name: string;
    lastMessageContent?: string;
    unSeenMessages: number;
    avatar?: AvatarImage;
    lastMessageTime: Date;
    recipientId?: string;
};

export default ConversationPreview;
