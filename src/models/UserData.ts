import ConversationPreview, { DBConversationPreview } from './ConversationPreview';
import UserProfile from './UserProfile';
import AvatarImage from './AvatarImage';

export type DBUserData = {
    id: string;
    handle: string;
    email: string;
    displayName?: string;
    phone?: string;
    // implement later!!;
    avatar?: AvatarImage;
    conversations: DBConversationPreview[];
    contacts?: string[];
    privateEncryptionKey?: string;
    pushTokens?: string[];
    archivedConvos?: string[];
};

type UserData = {
    id: string;
    handle: string;
    email: string;
    displayName?: string;
    phone?: string;
    // implement later!!;
    avatar?: AvatarImage;
    conversations: ConversationPreview[];
    contacts?: string[];
    privateEncryptionKey?: string;
    pushTokens?: string[];
    archivedConvos?: string[];
};

export default UserData;
