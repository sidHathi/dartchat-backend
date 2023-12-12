import ConversationPreview, { DBConversationPreview } from './ConversationPreview';
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
    devMode?: boolean;
    systemRole?: 'admin' | 'plebian';
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
    devMode?: boolean;
    systemRole?: 'admin' | 'plebian';
};

export default UserData;
