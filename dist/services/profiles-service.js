"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../firebase");
const request_utils_1 = require("../utils/request-utils");
const firestore_1 = require("firebase-admin/firestore");
const profilesCol = firebase_1.db.collection(process.env.FIREBASE_PROFILES_COL || 'profiles');
const createNewProfile = (newUser) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!newUser.id)
            throw new Error('invalid user');
        const userProfile = {
            id: newUser.id,
            handle: newUser.handle,
            phone: newUser.phone,
            email: newUser.email,
            displayName: newUser.displayName || newUser.handle,
            avatar: newUser.avatar,
            publicKey: newUser.publicKey
        };
        profilesCol.doc(newUser.id).set((0, request_utils_1.cleanUndefinedFields)(userProfile));
        return userProfile;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const updateProfile = (updatedUser) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!updatedUser.id)
            throw new Error('invalid user');
        const updatedUserProfile = {
            id: updatedUser.id,
            handle: updatedUser.handle,
            phone: updatedUser.phone,
            email: updatedUser.email,
            displayName: updatedUser.displayName || updatedUser.handle,
            avatar: updatedUser.avatar,
            publicKey: updatedUser.publicKey
        };
        profilesCol.doc(updatedUser.id).update((0, request_utils_1.cleanUndefinedFields)(updatedUserProfile));
        return updatedUserProfile;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getProfile = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const res = yield profilesCol.doc(id).get();
        if (!res.exists) {
            throw new Error('No user found for given id');
        }
        else {
            return res.data();
        }
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const profileSearch = (qString) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const matchingDocs = yield profilesCol
            .where(firestore_1.Filter.or(firestore_1.Filter.where('handle', '==', qString), firestore_1.Filter.where('email', '==', qString), firestore_1.Filter.where('phone', '==', qString)))
            .get();
        if (matchingDocs.empty) {
            return [];
        }
        return matchingDocs.docs.map((doc) => doc.data());
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getProfiles = (ids) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (ids.length < 1)
            return undefined;
        const batches = (0, request_utils_1.chunk)(ids, 10);
        const profiles = [];
        yield Promise.all(batches.map((batch) => __awaiter(void 0, void 0, void 0, function* () {
            const profileDocs = yield profilesCol.where('id', 'in', batch).get();
            profileDocs.forEach((doc) => profiles.push(doc.data()));
        })));
        return profiles;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const updatePublicKey = (uid, newKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updateRes = yield profilesCol.doc(uid).update({
            publicKey: newKey
        });
        return updateRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const profileService = {
    createNewProfile,
    updateProfile,
    getProfile,
    profileSearch,
    getProfiles,
    updatePublicKey
};
exports.default = profileService;
