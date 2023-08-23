import { Timestamp } from 'firebase-admin/firestore';
import UserConversationProfile from './UserConversationProfile';
import { ObjectRef } from './MessageObjects';

type MessageType = 'user' | 'system' | 'deletion';

type EncryptionLevel = 'none' | 'encrypted' | 'doubleRatchet';

export type MessageMedia = {
    id: string;
    type: string;
    uri: string;
    width: number;
    height: number;
};

type MessageBase = {
    id: string;
    timestamp: Date;
    messageType: MessageType;
    encryptionLevel: EncryptionLevel;
    senderId: string;
    likes: string[];
    senderProfile?: UserConversationProfile;
    delivered?: boolean;
    mentions?: UserConversationProfile[];
    replyRef?: ReplyRef;
    messageLink?: string;
};

export type DecryptedMessage = MessageBase & {
    content: string;
    media?: MessageMedia[];
    objectRef?: ObjectRef;
};

export type EncryptedMessage = MessageBase & {
    encryptedFields: string;
};

export type RawMessage = Omit<Message, 'timestamp'> & {
    timestamp: string;
};

export type DBMessage = Omit<Message, 'timestamp'> & {
    timestamp: Timestamp;
};

type Message = DecryptedMessage | EncryptedMessage;

type ReplyRef = {
    id: string;
    content: string;
    senderId: string;
    media?: string[];
};

export default Message;
