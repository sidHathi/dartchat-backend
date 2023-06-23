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

type ReplyRef = {
    id: string;
    content: string;
    senderId: string;
    media?: string[];
};

export default Message;
