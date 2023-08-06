import { db } from '../firebase';
import { UserData, UserProfile } from '../models';
import { cleanUndefinedFields } from '../utils/request-utils';
import { FieldPath, Filter } from 'firebase-admin/firestore';

const profilesCol = db.collection('profiles');

const createNewProfile = async (newUser: UserData) => {
    try {
        if (!newUser.id) throw new Error('invalid user');
        const userProfile: UserProfile = {
            id: newUser.id,
            handle: newUser.handle,
            phone: newUser.phone,
            email: newUser.email,
            displayName: newUser.displayName || newUser.handle
        };
        profilesCol.doc(newUser.id).set(cleanUndefinedFields(userProfile));
        return userProfile;
    } catch (err) {
        return Promise.reject(err);
    }
};

const updateProfile = async (updatedUser: UserData) => {
    try {
        if (!updatedUser.id) throw new Error('invalid user');
        const updatedUserProfile: UserProfile = {
            id: updatedUser.id,
            handle: updatedUser.handle,
            phone: updatedUser.phone,
            email: updatedUser.email,
            displayName: updatedUser.displayName || updatedUser.handle,
            avatar: updatedUser.avatar
        };
        profilesCol.doc(updatedUser.id).update(cleanUndefinedFields(updatedUserProfile));
        return updatedUserProfile;
    } catch (err) {
        return Promise.reject(err);
    }
};

const getProfile = async (id: string) => {
    try {
        const res = await profilesCol.doc(id).get();
        if (!res.exists) {
            throw new Error('No user found for given id');
        } else {
            return res.data();
        }
    } catch (err) {
        return Promise.reject(err);
    }
};

const profileSearch = async (qString: string) => {
    try {
        const matchingDocs = await profilesCol
            .where(
                Filter.or(
                    Filter.where('handle', '==', qString),
                    Filter.where('email', '==', qString),
                    Filter.where('phone', '==', qString)
                )
            )
            .get();
        if (matchingDocs.empty) {
            return [];
        }
        return matchingDocs.docs.map((doc) => doc.data());
    } catch (err) {
        return Promise.reject(err);
    }
};

const getProfiles = async (ids: string[]) => {
    try {
        if (ids.length < 1) return undefined;
        const profileDocs = await profilesCol.where('id', 'in', ids).get();
        const profiles: UserProfile[] = [];
        profileDocs.forEach((doc) => profiles.push(doc.data() as UserProfile));
        return profiles;
    } catch (err) {
        return Promise.reject(err);
    }
};

const updatePublicKey = async (uid: string, newKey: string) => {
    try {
        const updateRes = await profilesCol.doc(uid).update({
            publicKey: newKey
        });
        return updateRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const profileService = {
    createNewProfile,
    updateProfile,
    getProfile,
    profileSearch,
    getProfiles,
    updatePublicKey
};

export default profileService;
