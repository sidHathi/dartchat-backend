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
const pagination_1 = require("../pagination");
const uuid_1 = require("uuid");
const conversation_utils_1 = require("../utils/conversation-utils");
const secrets_service_1 = __importDefault(require("./secrets-service"));
const conversationsCol = firebase_1.db.collection(process.env.FIREBASE_CONVERSATIONS_COL || 'conversations-dev');
const usersCol = firebase_1.db.collection(process.env.FIREBASE_USERS_COL || 'users-dev');
const generateConversationInitMessage = (newConversation, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const timestamp = new Date();
    const messageType = 'system';
    const encryptionLevel = 'none';
    try {
        const userProfile = newConversation.participants.filter((p) => p.id === userId)[0];
        const content = `Chat created by ${userProfile.displayName}`;
        const newMessage = {
            timestamp,
            messageType,
            encryptionLevel,
            content,
            senderId: 'system',
            id: (0, uuid_1.v4)(),
            likes: [],
            inGallery: false
        };
        return newMessage;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const handleUserConversationMessage = (cid, cName, group, participantIds, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        participantIds.map((id) => __awaiter(void 0, void 0, void 0, function* () {
            const userDoc = yield usersCol.doc(id).get();
            if (userDoc.exists) {
                const user = userDoc.data();
                let unSeenMessages = 0;
                const matchingConvos = user.conversations.filter((c) => c.cid === cid);
                let avatar;
                let name = cName;
                let recipientId;
                if (matchingConvos.length > 0) {
                    unSeenMessages = matchingConvos[0].unSeenMessages;
                    avatar = matchingConvos[0].avatar;
                    if (!group) {
                        name = matchingConvos[0].name;
                        recipientId = matchingConvos[0].recipientId;
                    }
                }
                else {
                    return;
                }
                const lastMessageContent = 'encryptedFields' in message
                    ? message.encryptedFields
                    : message.content;
                usersCol.doc(id).update({
                    conversations: [
                        (0, request_utils_1.cleanUndefinedFields)(Object.assign(Object.assign({}, matchingConvos[0]), { cid,
                            name,
                            avatar, unSeenMessages: id === message.senderId ? 0 : unSeenMessages + 1, lastMessageTime: message.timestamp, lastMessageContent, lastMessage: message, recipientId })),
                        ...user.conversations.filter((c) => c.cid !== cid)
                    ]
                });
            }
        }));
    }
    catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
});
const storeNewMessage = (cid, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convoDoc = yield conversationsCol.doc(cid).get();
        const parsedMessage = (0, request_utils_1.parseRequestMessage)(message);
        const messageDoc = conversationsCol.doc(cid).collection('messages').doc(message.id);
        const res = yield messageDoc.set(parsedMessage);
        const convo = convoDoc.data();
        if (!convo)
            return Promise.reject('no such conversation');
        const participantIds = convo.participants.map((p) => p.id);
        yield handleUserConversationMessage(convo.id, convo.name, convo.group, participantIds, parsedMessage);
        if (message.encryptionLevel === 'encrypted') {
            yield secrets_service_1.default.updateKeyInfoForMessage(convo);
        }
        return res;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getConversationMessages = (cid, messageCursor) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const messageColRef = conversationsCol.doc(cid).collection('messages');
        const messageDocs = yield (0, pagination_1.getQueryForCursor)(messageColRef, messageCursor).get();
        const messages = [];
        messageDocs.forEach((md) => {
            messages.push((0, request_utils_1.parseDBMessage)(md.data()));
        });
        return messages;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getConversationMessagesToDate = (cid, messageCursor, date) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const messages = [];
        const cursor = Object.assign({}, messageCursor);
        while (messages.length === 0 || messages[messages.length - 1].timestamp.getTime() - date.getTime() > 0) {
            messages.push(...(yield getConversationMessages(cid, cursor)));
            cursor.prevLastVal = messages[messages.length - 1].timestamp;
        }
        return messages;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getConversationMessage = (cid, mid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const message = yield conversationsCol.doc(cid).collection('messages').doc(mid).get();
        if (message.exists) {
            return (0, request_utils_1.parseDBMessage)(message.data());
        }
        return Promise.reject('no such message');
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const storeNewLike = (cid, mid, uid, type) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const messageDoc = yield conversationsCol.doc(cid).collection('messages').doc(mid).get();
        if (messageDoc.exists) {
            const message = messageDoc.data();
            let updatedLikes = message.likes;
            if (type === 'newLike' && !message.likes.includes(uid)) {
                updatedLikes = [...message.likes, uid];
            }
            else if (type === 'disLike') {
                updatedLikes = message.likes.filter((u) => u !== uid);
            }
            yield conversationsCol.doc(cid).collection('messages').doc(mid).update({ likes: updatedLikes });
            return message;
        }
        return Promise.reject('no such message');
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const recordPollResponse = (convo, uid, pid, selectedOptionIndices) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!convo.polls)
            return Promise.reject('no such poll');
        const updatedPolls = convo.polls.map((poll) => {
            if (poll.id === pid) {
                return Object.assign(Object.assign({}, poll), { options: poll.options.map((opt) => {
                        if (selectedOptionIndices.includes(opt.idx)) {
                            return Object.assign(Object.assign({}, opt), { voters: [...opt.voters, uid] });
                        }
                        return opt;
                    }) });
            }
            return poll;
        });
        const updateRes = yield conversationsCol.doc(convo.id).update({
            polls: updatedPolls
        });
        if (updateRes) {
            return updateRes;
        }
        return Promise.reject('update failed');
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const recordEventRsvp = (convo, eid, uid, response) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!convo.events)
            return Promise.reject('no such event');
        let edited = false;
        const newEventsArr = convo.events.map((e) => {
            if (e.id === eid) {
                const clearedEvent = Object.assign(Object.assign({}, e), { notGoing: e.notGoing.filter((p) => p !== uid), going: e.going.filter((p) => p !== uid) });
                if (response === 'going') {
                    if (e.going.includes(uid)) {
                        if (e !== clearedEvent)
                            edited = true;
                        return clearedEvent;
                    }
                    const newEvent = Object.assign(Object.assign({}, e), { going: [...e.going.filter((p) => p !== uid), uid], notGoing: e.notGoing.filter((p) => p !== uid) });
                    if (e !== newEvent)
                        edited = true;
                    return newEvent;
                }
                else if (response === 'notGoing') {
                    if (e.notGoing.includes(uid)) {
                        if (e !== clearedEvent)
                            edited = true;
                        return clearedEvent;
                    }
                    const newEvent = Object.assign(Object.assign({}, e), { notGoing: [...e.notGoing.filter((p) => p !== uid), uid], going: e.going.filter((p) => p !== uid) });
                    if (e !== newEvent)
                        edited = true;
                    return newEvent;
                }
                else {
                    if (e !== clearedEvent)
                        edited = true;
                    return clearedEvent;
                }
            }
            return e;
        });
        yield conversationsCol.doc(convo.id).update({
            events: newEventsArr
        });
        return edited;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getGalleryMessages = (cid, cursor) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rawQuery = conversationsCol.doc(cid).collection('messages').orderBy('inGallery');
        const cursorQuery = (0, pagination_1.getQueryForCursor)(rawQuery, cursor);
        const messageDocs = yield cursorQuery.get();
        const messages = [];
        messageDocs.forEach((md) => {
            messages.push((0, request_utils_1.parseDBMessage)(md.data()));
        });
        return messages;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const getLargeMessageList = (cid, maxSize, dateLimit) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let messageQuery = conversationsCol.doc(cid).collection('messages').orderBy('timestamp', 'desc').limit(maxSize);
        if (dateLimit) {
            messageQuery = conversationsCol
                .doc(cid)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .where('timestamp', '>', dateLimit)
                .limit(maxSize);
        }
        const messageDocs = yield messageQuery.get();
        const messages = [];
        messageDocs.forEach((doc) => {
            messages.push((0, request_utils_1.parseDBMessage)(doc.data()));
        });
        return messages;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const reencryptMessages = (convo, reencryptionData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const idMap = Object.fromEntries(reencryptionData.data.map((triple) => [triple.id, triple]));
        const updateBatch = firebase_1.db.batch();
        const parsedMinDate = new Date(Date.parse(reencryptionData.minDate));
        const messageUpdateDocs = yield conversationsCol
            .doc(convo.id)
            .collection('messages')
            .where('timestamp', '>=', parsedMinDate)
            .get();
        messageUpdateDocs.forEach((doc) => {
            const message = doc.data();
            if (message.id in idMap) {
                const encryptedDataForId = idMap[message.id];
                if (!message.senderProfile)
                    return;
                updateBatch.update(doc.ref, {
                    encryptedFields: encryptedDataForId.encryptedFields,
                    senderProfile: Object.assign(Object.assign({}, message.senderProfile), { publicKey: encryptedDataForId.publicKey })
                });
            }
        });
        const messageDeletionDocs = yield conversationsCol
            .doc(convo.id)
            .collection('messages')
            .where('timestamp', '<', parsedMinDate)
            .get();
        messageDeletionDocs.forEach((doc) => {
            updateBatch.delete(doc.ref);
        });
        yield updateBatch.commit();
        yield secrets_service_1.default.updateKeyInfoForReencryption(convo, reencryptionData.data.length);
    }
    catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
});
const deleteMessage = (cid, actorId, mid) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const currMessage = yield getConversationMessage(cid, mid);
        if (currMessage.messageType === 'system')
            return;
        if (actorId !== currMessage.senderId) {
            const convo = (yield conversationsCol.doc(cid).get()).data();
            const actorRole = (_a = convo.participants.find((p) => p.id === actorId)) === null || _a === void 0 ? void 0 : _a.role;
            const recipientRole = (_b = convo.participants.find((p) => p.id === currMessage.senderId)) === null || _b === void 0 ? void 0 : _b.role;
            if (!(0, conversation_utils_1.hasPermissionForAction)('deleteForeignMessage', actorRole, recipientRole))
                return;
        }
        const updatedMessage = {
            id: currMessage.id,
            timestamp: currMessage.timestamp,
            messageType: 'deletion',
            encryptionLevel: 'none',
            senderId: currMessage.senderId,
            senderProfile: currMessage.senderProfile,
            delivered: true,
            content: 'Message deleted',
            likes: [],
            inGallery: false
        };
        yield conversationsCol.doc(cid).collection('messages').doc(mid).set((0, request_utils_1.cleanUndefinedFields)(updatedMessage));
        return true;
    }
    catch (err) {
        console.log(err);
        return false;
    }
});
const messagesService = {
    generateConversationInitMessage,
    handleUserConversationMessage,
    storeNewMessage,
    getConversationMessages,
    getConversationMessagesToDate,
    getConversationMessage,
    storeNewLike,
    recordPollResponse,
    recordEventRsvp,
    getGalleryMessages,
    getLargeMessageList,
    reencryptMessages,
    deleteMessage
};
exports.default = messagesService;
