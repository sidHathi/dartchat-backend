type UserProfile = {
    id: string;
    handle: string;
    displayName: string;
    alias?: string;
    // implement later!!
    profilePic?: any;
    publicEncryptionKey?: string;
};

export default UserProfile;
