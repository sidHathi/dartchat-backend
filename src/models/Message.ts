import { Timestamp } from 'firebase-admin/firestore';
import UserConversationProfile from './UserConversationProfile';
import { ObjectRef } from './MessageObjects';

type MessageType = 'plainText' | 'media' | 'ref' | 'system';

type EncryptionLevel = 'none' | 'e2e' | 'group' | 'doubleRatchet';

export type MessageMedia = {
    id: string;
    type: string;
    uri: string;
    width: number;
    height: number;
};

type Message = {
    id: string;
    content: string;
    media?: MessageMedia[];
    timestamp: Date;
    senderId: string;
    likes: string[];
    replyRef?: ReplyRef;
    messageType: MessageType;
    encryptionLevel: EncryptionLevel;
    senderProfile?: UserConversationProfile;
    mentions?: UserConversationProfile[];
    objectRef?: ObjectRef;
};

export type RawMessage = {
    id: string;
    content: string;
    media?: MessageMedia[];
    timestamp: string;
    senderId: string;
    likes: string[];
    replyRef?: ReplyRef;
    messageType: MessageType;
    encryptionLevel: EncryptionLevel;
    senderProfile?: UserConversationProfile;
    mentions?: UserConversationProfile[];
    objectRef?: ObjectRef;
};

export type DBMessage = {
    id: string;
    content: string;
    media?: MessageMedia[];
    timestamp: Timestamp;
    senderId: string;
    likes: string[];
    replyRef?: ReplyRef;
    messageType: MessageType;
    encryptionLevel: EncryptionLevel;
    senderProfile?: UserConversationProfile;
    mentions?: UserConversationProfile[];
    objectRef?: ObjectRef;
};

type ReplyRef = {
    id: string;
    content: string;
    senderId: string;
    media?: string[];
};

export default Message;
