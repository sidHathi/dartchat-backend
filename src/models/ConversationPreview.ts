import { Timestamp } from 'firebase-admin/firestore';
import AvatarImage from './AvatarImage';
import Message, { DBMessage } from './Message';
import { ChatRole } from './UserConversationProfile';

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
    userRole?: ChatRole;
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
    userRole?: ChatRole;
};

export default ConversationPreview;
