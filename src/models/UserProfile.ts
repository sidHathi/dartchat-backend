type UserProfile = {
    id: string;
    handle: string;
    displayName: string;
    email?: string;
    phone?: string;
    alias?: string;
    // implement later!!
    profilePic?: string;
    publicEncryptionKey?: string;
};

export default UserProfile;
