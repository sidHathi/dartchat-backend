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
    // privateEncryptionKey?: string;
    pushTokens?: string[];
    archivedConvos?: string[];
    publicKey?: string;
    keySalt?: string; // base64 encoded random prime number
    secrets?: string;
    uiTheme?: 'dark' | 'light';
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
    // privateEncryptionKey?: string;
    pushTokens?: string[];
    archivedConvos?: string[];
    publicKey?: string;
    keySalt?: string; // base64 encoded random prime number
    secrets?: string;
    uiTheme?: 'dark' | 'light';
};

export default UserData;
