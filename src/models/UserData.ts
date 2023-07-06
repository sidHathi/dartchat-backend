import ConversationPreview, { DBConversationPreview } from './ConversationPreview';
import UserProfile from './UserProfile';
import AvatarImage from './AvatarImage';

export type DBUserData = {
    id?: string;
    handle: string;
    email: string;
    displayName?: string;
    phone?: string;
    // implement later!!;
    avatar?: AvatarImage;
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
    avatar?: AvatarImage;
    conversations: ConversationPreview[];
    contacts: UserProfile[];
    privateEncryptionKey?: string;
};

export default UserData;
