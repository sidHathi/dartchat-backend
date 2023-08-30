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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../firebase");
const profiles_service_1 = __importDefault(require("./profiles-service"));
const request_utils_1 = require("../utils/request-utils");
const firestore_1 = require("firebase-admin/firestore");
const conversation_utils_1 = require("../utils/conversation-utils");
const usersCol = firebase_1.db.collection(process.env.FIREBASE_USERS_COL || 'users');
const conversationsCol = firebase_1.db.collection(process.env.FIREBASE_CONVERSATIONS_COL || 'conversations');
const getUser = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUser = yield usersCol.doc(userId).get();
        if (!currentUser.exists) {
            return Promise.reject('User does not exist');
        }
        return (0, request_utils_1.parseDBUserData)(currentUser.data());
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getMultipleUsers = (userIds) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (userIds.length < 1)
            return Promise.reject('invalid input');
        const batches = (0, request_utils_1.chunk)(userIds, 10);
        const res = [];
        yield Promise.all(batches.map((batch) => __awaiter(void 0, void 0, void 0, function* () {
            const userDocs = yield usersCol.where('id', 'in', batch).get();
            if (!userDocs.empty) {
                userDocs.forEach((doc) => {
                    res.push((0, request_utils_1.parseDBUserData)(doc.data()));
                });
            }
        })));
        if (res.length > 0)
            return res;
        return Promise.reject('No results found');
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const createNewUser = (userId, userDetails) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newUser = Object.assign(Object.assign({}, userDetails), { id: userId });
        if (!(yield checkValidHandle(newUser))) {
            return Promise.reject('Handle taken');
        }
        else if (!(yield checkValidPhone(newUser))) {
            return Promise.reject('Phone number in use');
        }
        yield usersCol.doc(userId).set((0, request_utils_1.cleanUndefinedFields)(newUser));
        yield profiles_service_1.default.createNewProfile(newUser);
        return newUser;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const updateUser = (userId, updatedUserDetails) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currUser = yield getUser(userId);
        const updatedUser = Object.assign(Object.assign(Object.assign({}, currUser), updatedUserDetails), { conversations: currUser.conversations.map((c) => (0, request_utils_1.cleanUndefinedFields)(c)), id: currUser.id });
        if ((currUser === null || currUser === void 0 ? void 0 : currUser.handle) !== updatedUserDetails.handle && !(yield checkValidHandle(updatedUser))) {
            return Promise.reject('Handle taken');
        }
        else if ((currUser === null || currUser === void 0 ? void 0 : currUser.phone) !== updatedUserDetails.phone && !(yield checkValidPhone(updatedUser))) {
            return Promise.reject('Phone number in use');
        }
        yield usersCol.doc(userId).update((0, request_utils_1.cleanUndefinedFields)(updatedUser));
        yield profiles_service_1.default.updateProfile((0, request_utils_1.cleanUndefinedFields)(updatedUser));
        return updatedUser;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getSocketUser = (socket) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = socket.data.user.uid;
        const socketUser = yield getUser(userId);
        return socketUser;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const checkValidHandle = (userData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!userData.handle)
            return false;
        const matchingHandles = yield usersCol.where('handle', '==', userData.handle).get();
        if (matchingHandles.empty)
            return true;
        return false;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const checkValidPhone = (userData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!userData.phone)
            return true;
        const matchingHandles = yield usersCol.where('phone', '==', userData.phone).get();
        if (matchingHandles.empty)
            return true;
        return false;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const handleReadReceipt = (uid, cid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield getUser(uid);
        if (user) {
            const updatedPreviews = user.conversations.map((c) => {
                if (c.cid === cid) {
                    return (0, request_utils_1.cleanUndefinedFields)(Object.assign(Object.assign({}, c), { unSeenMessages: 0 }));
                }
                return (0, request_utils_1.cleanUndefinedFields)(c);
            });
            return yield usersCol.doc(uid).update({
                conversations: updatedPreviews
            });
        }
        return Promise.reject('user not found');
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const updatePushNotificationTokens = (newToken, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield getUser(userId);
        if (user.pushTokens && user.pushTokens.includes(newToken)) {
            return;
        }
        const updateRes = yield usersCol.doc(userId).update({
            pushTokens: firestore_1.FieldValue.arrayUnion(newToken)
        });
        return updateRes;
    }
    catch (err) {
        console.log(err);
        return;
    }
});
const updatePreviewDetails = (updatedConvo, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const relevantUpdates = (0, request_utils_1.cleanUndefinedFields)({
            name: updatedConvo.name,
            avatar: updatedConvo.avatar
        });
        const user = yield getUser(userId);
        const matchingPreviews = user.conversations.filter((c) => c.cid === updatedConvo.id);
        if (matchingPreviews.length > 0) {
            const preview = matchingPreviews[0];
            const updatedPreview = Object.assign(Object.assign({}, preview), relevantUpdates);
            const res = yield usersCol.doc(userId).update({
                conversations: [
                    (0, request_utils_1.cleanUndefinedFields)(updatedPreview),
                    ...user.conversations.filter((c) => c.cid !== updatedConvo.id).map((c) => (0, request_utils_1.cleanUndefinedFields)(c))
                ]
            });
            return res;
        }
        return Promise.reject('no such preview');
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const handleLeaveConversation = (cid, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield getUser(userId);
        const filteredConvos = user.conversations.filter((c) => c.cid !== cid).map((c) => (0, request_utils_1.cleanUndefinedFields)(c));
        if (!filteredConvos)
            return;
        const res = usersCol.doc(userId).update({
            conversations: filteredConvos
        });
        return res;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const handleConversationAdd = (convo, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield getUser(userId);
        const previews = user.conversations.filter((c) => c.cid !== convo.id).map((p) => (0, request_utils_1.cleanUndefinedFields)(p));
        const newPreview = (0, request_utils_1.cleanUndefinedFields)({
            cid: convo.id,
            name: convo.name,
            unSeenMesages: 0,
            avatar: convo.avatar,
            lastMessageTime: new Date(),
            publicKey: convo.publicKey
        });
        usersCol.doc(userId).update({
            conversations: [newPreview, ...previews]
        });
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const addIdToContacts = (contactId, uid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currUser = yield getUser(uid);
        if (currUser.contacts && currUser.contacts.includes(contactId)) {
            return;
        }
        const updateRes = yield usersCol.doc(uid).update({
            contacts: firestore_1.FieldValue.arrayUnion(contactId)
        });
        return updateRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const addIdArrToContacts = (newContactIds, uid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currUser = yield getUser(uid);
        let filteredNewContactIds = newContactIds.filter((c) => c !== uid);
        if (currUser.contacts) {
            filteredNewContactIds = newContactIds.filter((c) => { var _a; return c !== uid && !((_a = currUser.contacts) === null || _a === void 0 ? void 0 : _a.includes(c)); });
        }
        if (filteredNewContactIds.length > 0) {
            const updateRes = yield usersCol.doc(uid).update({
                contacts: firestore_1.FieldValue.arrayUnion(...filteredNewContactIds)
            });
            return updateRes;
        }
        return undefined;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const addConvoToArchive = (convoId, uid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currUser = yield getUser(uid);
        if (currUser.archivedConvos && currUser.archivedConvos.includes(convoId))
            return;
        const updateRes = yield usersCol.doc(uid).update({
            archivedConvos: firestore_1.FieldValue.arrayUnion(convoId)
        });
        return updateRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const removeConvoFromArchive = (convoId, uid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currUser = yield getUser(uid);
        if (currUser.archivedConvos && currUser.archivedConvos.includes(convoId)) {
            const updateRes = yield usersCol.doc(uid).update({
                archivedConvos: currUser.archivedConvos.filter((c) => c !== convoId)
            });
            return updateRes;
        }
        return undefined;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const setUserPublicKey = (uid, publicKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updateRes = yield usersCol.doc(uid).update({
            publicKey
        });
        return updateRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const updatePreviewRole = (uid, cid, newRole) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield getUser(uid);
        const updatedPreviews = user.conversations.map((c) => {
            if (c.cid === cid) {
                return (0, request_utils_1.cleanUndefinedFields)(Object.assign(Object.assign({}, c), { userRole: newRole }));
            }
            return (0, request_utils_1.cleanUndefinedFields)(c);
        });
        if (updatePreviewDetails.length === 0)
            return;
        const updateRes = yield usersCol.doc(uid).update((0, request_utils_1.cleanUndefinedFields)({
            conversations: updatedPreviews
        }));
        return updateRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const updateConversationsForNewUserDetails = (userData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updateBatch = firebase_1.db.batch();
        yield Promise.all(userData.conversations.map((c) => __awaiter(void 0, void 0, void 0, function* () {
            const convoDoc = yield conversationsCol.doc(c.cid).get();
            const convo = (0, conversation_utils_1.parseDBConvo)(convoDoc.data());
            const existingProfile = convo.participants.find((p) => p.id === userData.id);
            if (existingProfile && !existingProfile.customProfile) {
                const newProfile = Object.assign(Object.assign({}, existingProfile), { avatar: userData.avatar || existingProfile.avatar, displayName: userData.displayName || existingProfile.displayName });
                const updatedParticipants = convo.participants.map((p) => {
                    if (p.id === userData.id)
                        return (0, request_utils_1.cleanUndefinedFields)(newProfile);
                    return (0, request_utils_1.cleanUndefinedFields)(p);
                });
                updateBatch.update(convoDoc.ref, {
                    participants: updatedParticipants
                });
            }
            if (!c.group) {
                const recipientProfile = convo.participants.find((p) => p.id !== userData.id);
                if (recipientProfile) {
                    const recipientDoc = yield usersCol.doc(recipientProfile.id).get();
                    const recipientData = (0, request_utils_1.parseDBUserData)(recipientDoc.data());
                    if (!recipientData)
                        return;
                    const existingPreview = recipientData.conversations.find((rc) => rc.cid === c.cid);
                    if (existingPreview) {
                        const updatedPreview = Object.assign(Object.assign({}, existingPreview), { name: userData.displayName || userData.handle || existingPreview.name, avatar: userData.avatar || (existingPreview === null || existingPreview === void 0 ? void 0 : existingPreview.name) });
                        updateBatch.update(recipientDoc.ref, {
                            conversations: recipientData.conversations.map((rc) => {
                                if (rc.cid === c.cid) {
                                    return (0, request_utils_1.cleanUndefinedFields)(updatedPreview);
                                }
                                return (0, request_utils_1.cleanUndefinedFields)(rc);
                            })
                        });
                    }
                }
            }
        })));
        yield updateBatch.commit();
    }
    catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
});
const updateNotStatus = (uid, cid, newStatus) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield getUser(uid);
        const updatedPreviews = user.conversations.map((c) => {
            if (c.cid === cid) {
                return (0, request_utils_1.cleanUndefinedFields)(Object.assign(Object.assign({}, c), { notifications: newStatus }));
            }
            return (0, request_utils_1.cleanUndefinedFields)(c);
        });
        yield usersCol.doc(uid).update({
            conversationsCol: updatedPreviews
        });
        return true;
    }
    catch (err) {
        return false;
    }
});
const usersService = {
    getUser,
    getMultipleUsers,
    createNewUser,
    updateUser,
    getSocketUser,
    handleReadReceipt,
    updatePushNotificationTokens,
    updatePreviewDetails,
    handleLeaveConversation,
    handleConversationAdd,
    addIdToContacts,
    addConvoToArchive,
    addIdArrToContacts,
    removeConvoFromArchive,
    setUserPublicKey,
    updatePreviewRole,
    updateConversationsForNewUserDetails,
    updateNotStatus
};
exports.default = usersService;
