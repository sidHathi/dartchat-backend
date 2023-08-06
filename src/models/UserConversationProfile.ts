import AvatarImage from './AvatarImage';

export type NotificationStatus = 'all' | 'mentions' | 'none';

type UserConversationProfile = {
    id: string;
    handle?: string;
    displayName: string;
    avatar?: AvatarImage;
    notifications?: NotificationStatus;
    // implement later!!
    publicKey?: string;
};

export default UserConversationProfile;
