import AvatarImage from './AvatarImage';

type UserProfile = {
    id: string;
    handle: string;
    displayName: string;
    email?: string;
    phone?: string;
    avatar?: AvatarImage;
    // implement later!!
    publicEncryptionKey?: string;
};

export default UserProfile;
