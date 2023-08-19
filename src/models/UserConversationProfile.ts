import AvatarImage from './AvatarImage';

export type NotificationStatus = 'all' | 'mentions' | 'none';

export type ChatRole = 'plebian' | 'admin';

type UserConversationProfile = {
    id: string;
    handle?: string;
    displayName: string;
    avatar?: AvatarImage;
    notifications?: NotificationStatus;
    publicKey?: string;
    role?: ChatRole;
};

export default UserConversationProfile;
