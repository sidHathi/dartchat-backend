import ConversationPreview from './ConversationPreview';
import UserProfile from './UserProfile';

type UserData = {
    id: string;
    handle: string;
    email: string;
    // secureKey: string;
    displayName?: string;
    phone?: string;
    // implement later!!;
    conversations: ConversationPreview[];
    contacts: UserProfile[];
    privateEncryptionKey?: string;
};

export default UserData;
