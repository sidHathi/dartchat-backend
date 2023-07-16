import AvatarImage from './AvatarImage';

export type NotificationStatus = 'all' | 'mentions' | 'none';

type UserConversationProfile = {
    id: string;
    handle?: string;
    displayName: string;
    avatar?: AvatarImage;
    notifications?: NotificationStatus;
    // implement later!!
    publicEncryptionKey?: string;
};

export default UserConversationProfile;
