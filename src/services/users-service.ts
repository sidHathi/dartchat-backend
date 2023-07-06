import { db } from '../firebase';
import { DBUserData, UserData } from '../models';
import profileService from './profiles-service';
import { cleanUndefinedFields, parseDBUserData } from '../utils/request-utils';
import { Socket } from 'socket.io';

const usersCol = db.collection('users');

const getCurrentUser = async (userId: string): Promise<UserData | never> => {
    try {
        const currentUser = await usersCol.doc(userId).get();
        if (!currentUser.exists) {
            return Promise.reject('User does not exist');
        }
        return parseDBUserData(currentUser.data() as DBUserData);
    } catch (err) {
        return Promise.reject(err);
    }
};

const createNewUser = async (userId: string, userDetails: UserData): Promise<UserData | never> => {
    try {
        const newUser: UserData = {
            ...userDetails,
            id: userId
        };
        if (!(await checkValidHandle(newUser))) {
            return Promise.reject('Handle taken');
        } else if (!(await checkValidPhone(newUser))) {
            return Promise.reject('Phone number in use');
        }
        await usersCol.doc(userId).set(cleanUndefinedFields(newUser));
        await profileService.createNewProfile(newUser);
        return newUser;
    } catch (err) {
        return Promise.reject(err);
    }
};

// modifying this function so that it no longer touches conversation previews -> all updates to previews should happen on message send/convo creation
const updateUser = async (userId: string, updatedUserDetails: UserData): Promise<UserData | never> => {
    try {
        const currUser = await getCurrentUser(userId);
        const updatedUser: UserData = {
            ...currUser,
            ...updatedUserDetails,
            conversations: currUser.conversations,
            id: currUser.id
        };
        if (currUser?.handle !== updatedUserDetails.handle && !(await checkValidHandle(updatedUser))) {
            return Promise.reject('Handle taken');
        } else if (currUser?.phone !== updatedUserDetails.phone && !(await checkValidPhone(updatedUser))) {
            return Promise.reject('Phone number in use');
        }
        await usersCol.doc(userId).update(cleanUndefinedFields(updatedUser));
        await profileService.updateProfile(updatedUser);
        return updatedUser;
    } catch (err) {
        return Promise.reject(err);
    }
};

const getSocketUser = async (socket: Socket): Promise<UserData | never> => {
    try {
        const userId = socket.data.user.uid;
        const socketUser: UserData = await getCurrentUser(userId);
        return socketUser;
    } catch (err) {
        return Promise.reject(err);
    }
};

const checkValidHandle = async (userData: UserData, userId?: string): Promise<boolean | never> => {
    try {
        if (!userData.handle) return false;
        const matchingHandles = await usersCol.where('handle', '==', userData.handle).get();
        if (matchingHandles.empty) return true;
        return false;
    } catch (err) {
        return Promise.reject(err);
    }
};

const checkValidPhone = async (userData: UserData): Promise<boolean | never> => {
    try {
        if (!userData.phone) return true;
        const matchingHandles = await usersCol.where('phone', '==', userData.phone).get();
        if (matchingHandles.empty) return true;
        return false;
    } catch (err) {
        return Promise.reject(err);
    }
};

const handleReadReceipt = async (uid: string, cid: string) => {
    try {
        const userDoc = await usersCol.doc(uid).get();
        if (userDoc.exists) {
            const user = parseDBUserData(userDoc.data() as DBUserData);
            const previews = user.conversations.filter((c) => c.cid === cid);
            if (previews && previews.length > 0) {
                const preview = previews[0];
                const updatedUser = {
                    ...user,
                    conversations: [
                        ...user.conversations.filter((c) => c.cid !== cid),
                        {
                            ...preview,
                            unSeenMessages: 0
                        }
                    ]
                };
                return usersService.updateUser(uid, updatedUser);
            }
            return Promise.reject('conversation preview not found');
        }
        return Promise.reject('user not found');
    } catch (err) {
        return Promise.reject(err);
    }
};

const usersService = {
    getCurrentUser,
    createNewUser,
    updateUser,
    getSocketUser,
    handleReadReceipt
};

export default usersService;
