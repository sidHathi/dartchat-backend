import { Timestamp } from 'firebase-admin/firestore';
import AvatarImage from './AvatarImage';
import Message, { DBMessage } from './Message';

export type DBConversationPreview = {
    cid: string;
    name: string;
    lastMessageContent?: string;
    unSeenMessages: number;
    avatar?: AvatarImage;
    lastMessageTime: Timestamp;
    recipientId?: string;
    group: boolean;
    lastMessage?: DBMessage;
    keyUpdate?: string;
    publicKey?: string;
};

type ConversationPreview = {
    cid: string;
    name: string;
    lastMessageContent?: string;
    lastMessage?: Message;
    unSeenMessages: number;
    avatar?: AvatarImage;
    lastMessageTime: Date;
    recipientId?: string;
    group: boolean;
    keyUpdate?: string;
    publicKey?: string;
};

export default ConversationPreview;
