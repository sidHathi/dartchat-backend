import AvatarImage from './AvatarImage';

type UserProfile = {
    id: string;
    handle: string;
    displayName: string;
    email?: string;
    phone?: string;
    avatar?: AvatarImage;
    publicKey?: string;
};

export default UserProfile;
