import { db } from '../firebase';
import { UserData } from '../models';
import profileService from './profiles-service';
import { cleanUndefinedFields } from '../utils';

const usersCollectionName = 'users';

const createNewUser = async (userId: string, userDetails: UserData): Promise<UserData | never> => {
    try {
        const newUser: UserData = {
            ...userDetails,
            id: userId
        };
        const usersCol = db.collection(usersCollectionName);
        await usersCol.doc(userId).set(cleanUndefinedFields(newUser));
        await profileService.createNewProfile(newUser);
        return newUser;
    } catch (err) {
        return Promise.reject(err);
    }
};

const updateUser = async (userId: string, updatedUserDetails: UserData): Promise<UserData | never> => {
    try {
        const updatedUser: UserData = {
            ...updatedUserDetails,
            id: userId
        };
        const usersCol = db.collection(usersCollectionName);
        await usersCol.doc(userId).update(cleanUndefinedFields(updatedUser));
        await profileService.updateProfile(updatedUser);
        return updatedUser;
    } catch (err) {
        return Promise.reject(err);
    }
};

const usersService = { createNewUser, updateUser };

export default usersService;
