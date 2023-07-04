import ConversationPreview, { DBConversationPreview } from './ConversationPreview';
import UserProfile from './UserProfile';

export type DBUserData = {
    id?: string;
    handle: string;
    email: string;
    displayName?: string;
    phone?: string;
    // implement later!!;
    profilePic?: string;
    conversations: DBConversationPreview[];
    contacts: UserProfile[];
    privateEncryptionKey?: string;
};

type UserData = {
    id?: string;
    handle: string;
    email: string;
    displayName?: string;
    phone?: string;
    // implement later!!;
    profilePic?: string;
    conversations: ConversationPreview[];
    contacts: UserProfile[];
    privateEncryptionKey?: string;
};

export default UserData;
