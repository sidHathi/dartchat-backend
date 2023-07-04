import { Timestamp } from 'firebase-admin/firestore';

type MessageType = 'plainText' | 'media' | 'ref' | 'system';

type EncryptionLevel = 'none' | 'e2e' | 'group' | 'doubleRatchet';

type Message = {
    id: string;
    content: string;
    media?: string[];
    timestamp: Date;
    senderId: string;
    likes: string[];
    replyRef?: ReplyRef;
    messageType: MessageType;
    encryptionLevel: EncryptionLevel;
};

export type RawMessage = {
    id: string;
    content: string;
    media?: string[];
    timestamp: string;
    senderId: string;
    likes: string[];
    replyRef?: ReplyRef;
    messageType: MessageType;
    encryptionLevel: EncryptionLevel;
};

export type DBMessage = {
    id: string;
    content: string;
    media?: string[];
    timestamp: Timestamp;
    senderId: string;
    likes: string[];
    replyRef?: ReplyRef;
    messageType: MessageType;
    encryptionLevel: EncryptionLevel;
};

type ReplyRef = {
    id: string;
    content: string;
    senderId: string;
    media?: string[];
};

export default Message;
