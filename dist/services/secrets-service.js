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
const usersCol = firebase_1.db.collection(process.env.FIREBASE_USERS_COL || 'users-dev');
const conversationsCol = firebase_1.db.collection(process.env.FIREBASE_CONVERSATIONS_COL || 'conversations-dev');
const handleKeyUpdateReceipt = (user, cids) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return true;
    }
    catch (err) {
        console.log(err);
        return false;
    }
});
const setUserKeySalt = (uid, salt) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updateRes = usersCol.doc(uid).update({
            keySalt: salt
        });
        return updateRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const setUserSecrets = (uid, secrets) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updateRes = usersCol.doc(uid).update({
            secrets
        });
        return updateRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const performKeyUpdate = (cid, users, userKeyMap, newPublicKey) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updateBatch = firebase_1.db.batch();
        yield Promise.all(users.map((participant) => __awaiter(void 0, void 0, void 0, function* () {
            const userDoc = yield usersCol.doc(participant.id).get();
            const user = (0, request_utils_1.parseDBUserData)(userDoc.data());
            const updatedUserPreviews = user.conversations.map((preview) => {
                if (preview.cid === cid &&
                    participant.id in userKeyMap &&
                    userKeyMap[participant.id] !== undefined) {
                    const keyUpdate = userKeyMap[participant.id];
                    return (0, request_utils_1.cleanUndefinedFields)(Object.assign(Object.assign({}, preview), { keyUpdate, publicKey: newPublicKey }));
                }
                return (0, request_utils_1.cleanUndefinedFields)(preview);
            });
            updateBatch.update(userDoc.ref, {
                conversations: updatedUserPreviews
            });
        })));
        yield updateBatch.commit();
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const addUserSecretsForNewConversation = (newConvo, uid, userKeyMap) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (newConvo.publicKey) {
            yield performKeyUpdate(newConvo.id, newConvo.participants, userKeyMap, newConvo.publicKey);
        }
        yield conversationsCol.doc(newConvo.id).update({
            keyInfo: {
                createdAt: new Date(),
                privilegedUsers: [uid, ...Object.keys(userKeyMap)] || [],
                numberOfMessages: 0
            }
        });
        return true;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const addUserSecretsForNewParticipants = (convo, newParticipants, userKeyMap) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (convo.publicKey) {
            yield performKeyUpdate(convo.id, newParticipants, userKeyMap, convo.publicKey);
        }
        const currentKeyInfo = convo.keyInfo;
        const keySet = new Set(((_a = convo.keyInfo) === null || _a === void 0 ? void 0 : _a.privilegedUsers) || []);
        if (currentKeyInfo) {
            yield conversationsCol.doc(convo.id).update({
                keyInfo: Object.assign(Object.assign({}, currentKeyInfo), { privilegedUsers: [
                        ...currentKeyInfo.privilegedUsers,
                        ...Object.keys(userKeyMap).filter((key) => !keySet.has(key))
                    ] })
            });
        }
        return true;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getReencryptionFieldsForMessageList = (messages) => {
    try {
        let minDate = new Date();
        const encryptionFields = messages
            .map((message) => {
            var _a;
            if (message.encryptionLevel === 'none' || !message.senderProfile || !message.senderProfile.publicKey) {
                return undefined;
            }
            if (message.timestamp < minDate)
                minDate = message.timestamp;
            const encrytped = message;
            return {
                id: encrytped.id,
                encryptedFields: encrytped.encryptedFields,
                publicKey: (_a = encrytped.senderProfile) === null || _a === void 0 ? void 0 : _a.publicKey
            };
        })
            .filter((m) => m !== undefined);
        return {
            data: encryptionFields,
            minDate
        };
    }
    catch (err) {
        return Promise.reject(err);
    }
};
const changeEncryptionKey = (convo, publicKey, senderId, userKeyMap, keyInfo) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield conversationsCol.doc(convo.id).update({
            publicKey,
            keyInfo: keyInfo || {
                createdAt: new Date(),
                privilegedUsers: [senderId, ...Object.keys(userKeyMap)],
                numberOfMessages: 0
            }
        });
        yield performKeyUpdate(convo.id, convo.participants, userKeyMap, publicKey);
        return true;
    }
    catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
});
const updateKeyInfoForMessage = (convo) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!convo.keyInfo)
            return;
        yield conversationsCol.doc(convo.id).update({
            keyInfo: Object.assign(Object.assign({}, convo.keyInfo), { numberOfMessages: convo.keyInfo.numberOfMessages + 1 })
        });
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const updateKeyInfoForReencryption = (convo, numMessages) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!convo.keyInfo)
            return;
        yield conversationsCol.doc(convo.id).update({
            keyInfo: Object.assign(Object.assign({}, convo.keyInfo), { numberOfMessages: convo.keyInfo.numberOfMessages + numMessages })
        });
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const addKeyInfo = (convo) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const keyInfo = {
            createdAt: new Date(),
            privilegedUsers: convo.participants.map((p) => p.id),
            numberOfMessages: 0
        };
        yield conversationsCol.doc(convo.id).update({
            keyInfo
        });
        return keyInfo;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const secretsService = {
    handleKeyUpdateReceipt,
    setUserKeySalt,
    setUserSecrets,
    addUserSecretsForNewConversation,
    addUserSecretsForNewParticipants,
    getReencryptionFieldsForMessageList,
    changeEncryptionKey,
    updateKeyInfoForMessage,
    updateKeyInfoForReencryption,
    addKeyInfo
};
exports.default = secretsService;
