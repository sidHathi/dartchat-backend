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
const request_utils_1 = require("../utils/request-utils");
const firestore_1 = require("firebase-admin/firestore");
const users_service_1 = __importDefault(require("./users-service"));
const pagination_1 = require("../pagination");
const request_utils_2 = require("../utils/request-utils");
const conversation_utils_1 = require("../utils/conversation-utils");
const messages_service_1 = __importDefault(require("./messages-service"));
const secrets_service_1 = __importDefault(require("./secrets-service"));
const usersCol = firebase_1.db.collection(process.env.FIREBASE_USERS_COL || 'users');
const conversationsCol = firebase_1.db.collection(process.env.FIREBASE_CONVERSATIONS_COL || 'conversations');
const createNewConversation = (newConversation, uid, userKeyMap) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield conversationsCol.doc(newConversation.id).set((0, conversation_utils_1.cleanConversation)(newConversation));
        conversationsCol.doc(newConversation.id).collection('messages');
        yield addUsersToNewConversation(newConversation);
        if (userKeyMap && newConversation.publicKey) {
            yield secrets_service_1.default.addUserSecretsForNewConversation(newConversation, uid, userKeyMap);
        }
        return newConversation;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getConversationInfo = (cid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convoDoc = yield conversationsCol.doc(cid).get();
        const convo = (0, conversation_utils_1.parseDBConvo)(convoDoc.data());
        if (!convo)
            return Promise.reject('no such convo');
        if (!convo.keyInfo) {
            convo.keyInfo = yield secrets_service_1.default.addKeyInfo(convo);
        }
        return convo;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const addUsersToNewConversation = (newConversation) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pids = newConversation.participants.map((p) => p.id);
        const previewsForUsers = {};
        newConversation.participants.map((participant) => {
            const preview = {
                cid: newConversation.id,
                unSeenMessages: 0,
                lastMessageTime: new Date(),
                avatar: (0, conversation_utils_1.getUserConversationAvatar)(newConversation, participant.id),
                group: newConversation.group,
                publicKey: newConversation.publicKey,
                userRole: participant.role
            };
            if (!newConversation.group) {
                const otherParticipant = newConversation.participants.filter((p) => p.id !== participant.id)[0];
                preview.name = otherParticipant.displayName;
                preview.recipientId = otherParticipant.id;
            }
            else {
                preview.name = newConversation.name;
            }
            previewsForUsers[participant.id] = preview;
        });
        yield Promise.all(Object.entries(previewsForUsers).map(([id, preview]) => __awaiter(void 0, void 0, void 0, function* () {
            yield usersCol.doc(id).update({
                conversations: firestore_1.FieldValue.arrayUnion((0, request_utils_1.cleanUndefinedFields)(preview))
            });
            yield users_service_1.default.addIdArrToContacts(pids, id);
        })));
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getConversation = (cid, messageCursor) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convoRes = yield conversationsCol.doc(cid).get();
        const messageColRef = conversationsCol.doc(cid).collection('messages');
        const messageDocs = yield (0, pagination_1.getQueryForCursor)(messageColRef, messageCursor).get();
        const messages = [];
        messageDocs.forEach((md) => {
            messages.push((0, request_utils_2.parseDBMessage)(md.data()));
        });
        if (convoRes.exists) {
            const rawConvo = (0, conversation_utils_1.parseDBConvo)(convoRes.data());
            rawConvo.messages = messages;
            if (!rawConvo.keyInfo) {
                rawConvo.keyInfo = yield secrets_service_1.default.addKeyInfo(rawConvo);
            }
            return rawConvo;
        }
        return null;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const conversationExists = (cid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convoDoc = yield conversationsCol.doc(cid).get();
        return convoDoc.exists;
    }
    catch (err) {
        console.log(err);
        return false;
    }
});
const deleteConversation = (cid, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convo = (yield conversationsCol.doc(cid).get()).data();
        if (!convo) {
            const currentUser = yield users_service_1.default.getUser(userId);
            if (currentUser && currentUser.conversations) {
                const res = yield users_service_1.default.updateUser(userId, Object.assign(Object.assign({}, currentUser), { conversations: currentUser.conversations.filter((c) => c.cid !== cid) || [] }));
                return res;
            }
        }
        convo.participants.map((p) => __awaiter(void 0, void 0, void 0, function* () {
            const user = (yield usersCol.doc(p.id).get()).data();
            if (!user.conversations)
                return;
            const prev = user.conversations.filter((c) => c.cid === cid);
            if (prev.length > 0) {
                yield usersCol.doc(p.id).update({
                    conversations: firestore_1.FieldValue.arrayRemove(prev[0])
                });
            }
        }));
        const messageDocs = yield conversationsCol.doc(cid).collection('messages').get();
        const batch = firebase_1.db.batch();
        messageDocs.forEach((md) => {
            batch.delete(md.ref);
        });
        yield batch.commit();
        const delRes = yield conversationsCol.doc(cid).delete();
        return delRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const updateConversationProfile = (cid, newProfile) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convo = yield getConversationInfo(cid);
        const newParticipants = [
            ...convo.participants.filter((p) => p.id !== newProfile.id).map((p) => (0, request_utils_1.cleanUndefinedFields)(p)),
            (0, request_utils_1.cleanUndefinedFields)(Object.assign(Object.assign({}, newProfile), { customProfile: true }))
        ];
        const res = yield conversationsCol.doc(cid).update({
            participants: newParticipants
        });
        return res;
    }
    catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
});
const updateConversationDetails = (cid, newDetails) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const udpates = (0, request_utils_1.cleanUndefinedFields)({
            name: newDetails.newName,
            avatar: newDetails.newAvatar
        });
        const res = yield conversationsCol.doc(cid).update((0, request_utils_1.cleanUndefinedFields)(udpates));
        if (res) {
            yield updateConversationPreviews(cid);
            return res;
        }
        else {
            return Promise.reject('update failed');
        }
    }
    catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
});
const updateConversationPreviews = (cid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convoDoc = yield conversationsCol.doc(cid).get();
        if (convoDoc.exists) {
            const convo = (0, conversation_utils_1.parseDBConvo)(convoDoc.data());
            if (!convo.participants)
                return;
            convo.participants.map((p) => __awaiter(void 0, void 0, void 0, function* () { return users_service_1.default.updatePreviewDetails(convo, p.id); }));
            return true;
        }
        return Promise.reject('no such conversation');
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const updateUserNotStatus = (cid, uid, newStatus) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convo = yield getConversationInfo(cid);
        const matches = convo.participants.filter((p) => p.id === uid);
        if (matches.length > 0) {
            const updatedProfile = Object.assign(Object.assign({}, matches[0]), { notifications: newStatus });
            const updatedProfilesList = [updatedProfile, ...convo.participants.filter((p) => p.id !== uid)];
            const res = conversationsCol.doc(convo.id).update({
                participants: updatedProfilesList
            });
            yield users_service_1.default.updateNotStatus(uid, cid, newStatus);
            return res;
        }
        return Promise.reject('no such profile in conversation');
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const addUsers = (cid, profiles) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const initialConvo = yield getConversationInfo(cid);
        const correctlyPermissionedProfiles = profiles.map((p) => {
            var _a;
            const isAdmin = (_a = initialConvo.adminIds) === null || _a === void 0 ? void 0 : _a.includes(p.id);
            if (p.role === 'admin' && !isAdmin) {
                return (0, request_utils_1.cleanUndefinedFields)(Object.assign(Object.assign({}, p), { role: 'plebian' }));
            }
            else if (p.role !== 'admin' && isAdmin) {
                return (0, request_utils_1.cleanUndefinedFields)(Object.assign(Object.assign({}, p), { role: 'admin' }));
            }
            return (0, request_utils_1.cleanUndefinedFields)(p);
        });
        const res = yield conversationsCol.doc(cid).update({
            participants: firestore_1.FieldValue.arrayUnion(...correctlyPermissionedProfiles)
        });
        if (res) {
            const updatedConvo = yield getConversationInfo(cid);
            const pids = updatedConvo.participants.map((p) => p.id);
            yield Promise.all(correctlyPermissionedProfiles.map((profile) => __awaiter(void 0, void 0, void 0, function* () {
                yield users_service_1.default.handleConversationAdd(updatedConvo, profile.id);
                yield users_service_1.default.addIdArrToContacts(pids, profile.id);
                yield users_service_1.default.removeConvoFromArchive(cid, profile.id);
            })));
        }
        return res;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const removeUser = (cid, actorId, uid, archive) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const convo = yield getConversationInfo(cid);
        const actorRole = (_a = convo.participants.find((p) => p.id === actorId)) === null || _a === void 0 ? void 0 : _a.role;
        const recipientRole = (_b = convo.participants.find((p) => p.id === uid)) === null || _b === void 0 ? void 0 : _b.role;
        if (!(0, conversation_utils_1.hasPermissionForAction)('removeUser', actorRole, recipientRole))
            return;
        const updatedParticipants = convo.participants.filter((p) => p.id !== uid).map((p) => (0, request_utils_1.cleanUndefinedFields)(p));
        const res = yield conversationsCol.doc(cid).update({
            participants: updatedParticipants || []
        });
        if (res) {
            yield users_service_1.default.handleLeaveConversation(cid, uid);
            if (archive) {
                yield users_service_1.default.addConvoToArchive(cid, uid);
            }
        }
        return res;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const addPoll = (cid, poll) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const res = yield conversationsCol.doc(cid).update({
            polls: firestore_1.FieldValue.arrayUnion(poll)
        });
        if (res)
            return res;
        return Promise.reject('update failed');
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const recordPollResponse = (cid, uid, pid, selectedOptionIndices) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convo = yield getConversationInfo(cid);
        const updateRes = yield messages_service_1.default.recordPollResponse(convo, uid, pid, selectedOptionIndices);
        if (updateRes) {
            return updateRes;
        }
        return Promise.reject('update failed');
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getPoll = (cid, pid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convo = yield getConversationInfo(cid);
        if (convo.polls) {
            const matches = convo.polls.filter((poll) => poll.id === pid);
            if (matches.length > 0) {
                return matches[0];
            }
        }
        return Promise.reject('poll not found');
    }
    catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
});
const addEvent = (cid, event) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const res = yield conversationsCol.doc(cid).update({
            events: firestore_1.FieldValue.arrayUnion(event)
        });
        if (res)
            return res;
        return Promise.reject('update failed');
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const recordEventRsvp = (cid, eid, uid, response) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convo = yield getConversationInfo(cid);
        const updateRes = yield messages_service_1.default.recordEventRsvp(convo, eid, uid, response);
        return updateRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getEvent = (cid, eid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convo = yield getConversationInfo(cid);
        if (!convo.events)
            return Promise.reject('no such event');
        const matches = convo.events.filter((e) => e.id === eid);
        if (matches.length < 1)
            return Promise.reject('no such event');
        return matches[0];
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const changeLikeIcon = (cid, newLikeIcon) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updateRes = yield conversationsCol.doc(cid).update({
            customLikeIcon: newLikeIcon
        });
        return updateRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const resetLikeIcon = (cid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updateRes = yield conversationsCol.doc(cid).update({
            customLikeIcon: firestore_1.FieldValue.delete()
        });
        return updateRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getConversationsInfo = (cids) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (cids.length < 1)
            return undefined;
        const batchedCids = (0, request_utils_1.chunk)(cids, 10);
        const conversations = [];
        yield Promise.all(batchedCids.map((batch) => __awaiter(void 0, void 0, void 0, function* () {
            const conversationDocs = yield conversationsCol.where('id', 'in', batch).get();
            conversationDocs.forEach((c) => conversations.push((0, conversation_utils_1.parseDBConvo)(c.data())));
        })));
        return conversations;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const changeConversationUserRole = (cid, actorId, uid, newRole) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d;
    try {
        const convo = yield getConversationInfo(cid);
        if (!convo)
            return;
        const actorRole = (_c = convo.participants.find((p) => p.id === actorId)) === null || _c === void 0 ? void 0 : _c.role;
        const recipientRole = (_d = convo.participants.find((p) => p.id === uid)) === null || _d === void 0 ? void 0 : _d.role;
        if (!(0, conversation_utils_1.hasPermissionForAction)('changeUserRole', actorRole, recipientRole))
            return;
        const newParticipants = convo.participants.map((p) => {
            if (p.id === uid) {
                return Object.assign(Object.assign({}, p), { role: newRole });
            }
            return p;
        });
        if (newParticipants.length === 0)
            return;
        let newAdminList = convo.adminIds || [];
        if (newRole === 'admin') {
            newAdminList = [...newAdminList, uid];
        }
        else {
            newAdminList = newAdminList.filter((id) => id !== uid);
        }
        const updateRes = yield conversationsCol.doc(cid).update({
            participants: newParticipants || [],
            adminIds: newAdminList || []
        });
        return updateRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const conversationsService = {
    createNewConversation,
    getConversationInfo,
    addUsersToNewConversation,
    getConversation,
    conversationExists,
    deleteConversation,
    updateConversationProfile,
    updateConversationDetails,
    updateConversationPreviews,
    updateUserNotStatus,
    addUsers,
    removeUser,
    addPoll,
    recordPollResponse,
    getPoll,
    addEvent,
    recordEventRsvp,
    getEvent,
    changeLikeIcon,
    resetLikeIcon,
    getConversationsInfo,
    changeConversationUserRole
};
exports.default = conversationsService;
