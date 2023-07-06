import AvatarImage from './AvatarImage';

type UserProfile = {
    id: string;
    handle: string;
    displayName: string;
    email?: string;
    phone?: string;
    alias?: string;
    // implement later!!
    avatar?: AvatarImage;
    publicEncryptionKey?: string;
};

export default UserProfile;
