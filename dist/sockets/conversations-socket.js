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
const services_1 = require("../services");
const newConversation = (socket, newConvo, userSocketMap, recipientKeyMap, pnService) => __awaiter(void 0, void 0, void 0, function* () {
    socket.join(newConvo.id);
    try {
        const user = socket.data.user;
        if (yield services_1.conversationsService.conversationExists(newConvo.id)) {
            return newConvo;
        }
        const seedMessage = yield services_1.messagesService.generateConversationInitMessage(newConvo, user.uid);
        yield services_1.conversationsService.createNewConversation(newConvo, user.uid, recipientKeyMap);
        yield services_1.messagesService.storeNewMessage(newConvo.id, seedMessage);
        const recipients = newConvo.participants;
        recipients.map((r) => {
            socket.to(r.id).emit('newConversation', newConvo, recipientKeyMap);
        });
        socket.to(newConvo.id).emit('newMessage', newConvo.id, seedMessage);
        socket.emit('newMessage', newConvo.id, seedMessage);
        socket.emit('conversationReceived', newConvo);
        socket.join(newConvo.id);
        if (pnService) {
            if (newConvo.publicKey && recipientKeyMap) {
                yield pnService.pushNewSecrets(newConvo, user.uid, newConvo.publicKey, recipientKeyMap);
            }
            yield pnService.pushNewConvo(newConvo, user.uid, recipientKeyMap);
        }
        return newConvo;
    }
    catch (err) {
        console.log(err);
        return null;
    }
});
const newPrivateMessage = (socket, seedConvo, userSocketMap, firstMessage, recipientKeyMap, pnService) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newConvo = yield newConversation(socket, seedConvo, userSocketMap, recipientKeyMap, pnService);
        if (newConvo) {
            socket.emit('newConversation', newConvo);
            const deliveredMessage = Object.assign(Object.assign({}, firstMessage), { delivered: true, timestamp: new Date() });
            yield services_1.messagesService.storeNewMessage(newConvo.id, deliveredMessage);
            socket.to(newConvo.id).emit('newMessage', newConvo.id, deliveredMessage);
            socket.emit('newMessage', newConvo.id, deliveredMessage);
            if (pnService && newConvo) {
                if (newConvo.publicKey && recipientKeyMap) {
                    const senderId = socket.data.user.uid;
                    yield pnService.pushNewSecrets(newConvo, senderId, newConvo.publicKey, recipientKeyMap);
                    yield new Promise((res) => setTimeout(res, 100));
                }
                yield pnService.pushMessage(newConvo.id, deliveredMessage);
            }
        }
        return newConvo;
    }
    catch (err) {
        console.log(err);
        return null;
    }
});
const conversationDelete = (socket, cid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = socket.data.user;
        const deletionRes = yield services_1.conversationsService.deleteConversation(cid, user.uid);
        socket.to(cid).emit('deleteConversation', cid);
        return deletionRes;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const newUpdateEvent = (socket, cid) => __awaiter(void 0, void 0, void 0, function* () {
    socket.to(cid).emit('updateConversationDetails', cid);
});
const handleNewName = (socket, cid, newName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const senderId = socket.data.user.uid;
        const convo = yield services_1.conversationsService.getConversationInfo(cid);
        yield services_1.systemMessagingService.handleChatNameChanged(convo, senderId, newName, socket);
    }
    catch (err) {
        console.log(err);
    }
});
const handleNewAvatar = (socket, cid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const senderId = socket.data.user.uid;
        const convo = yield services_1.conversationsService.getConversationInfo(cid);
        yield services_1.systemMessagingService.handleChatAvatarChanged(convo, senderId, socket);
    }
    catch (err) {
        console.log(err);
    }
});
const newParticipants = (socket, cid, profiles, userSocketMap, userKeyMap, pnService) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`userKeyMap: ${JSON.stringify(userKeyMap)}`);
    socket.to(cid).emit('newConversationUsers', cid, profiles);
    const senderId = socket.data.user.uid;
    const convo = yield services_1.conversationsService.getConversationInfo(cid);
    if (userKeyMap) {
        yield services_1.secretsService.addUserSecretsForNewParticipants(convo, profiles, userKeyMap);
    }
    yield Promise.all(profiles.map((p) => __awaiter(void 0, void 0, void 0, function* () {
        socket.to(p.id).emit('newConversationUsers', cid, [], userKeyMap);
        if (p.id !== senderId) {
            yield services_1.systemMessagingService.handleUserAdded(convo, p.id, senderId, socket);
        }
        else {
            yield services_1.systemMessagingService.handleUserJoins(convo, p, socket);
        }
    })));
    if (pnService) {
        const senderProfile = convo.participants.find((p) => p.id === senderId);
        if (senderProfile) {
            if (userKeyMap && convo.publicKey) {
                yield pnService.pushNewSecrets(convo, senderProfile.id, convo.publicKey, userKeyMap);
            }
            yield pnService.pushNewConvoParticipants(convo, senderProfile, profiles, userKeyMap);
        }
    }
});
const removeParticipant = (socket, cid, profile) => __awaiter(void 0, void 0, void 0, function* () {
    socket.to(cid).emit('removeConversationUser', cid, profile.id);
    const senderId = socket.data.user.uid;
    try {
        const convo = yield services_1.conversationsService.getConversationInfo(cid);
        if (senderId === profile.id) {
            yield services_1.systemMessagingService.handleUserLeaves(convo, profile, socket);
        }
        else {
            yield services_1.systemMessagingService.handleUserRemoved(convo, profile, senderId, socket);
        }
    }
    catch (err) {
        console.log(err);
    }
});
const handlePollResponse = (socket, cid, pid, selectedOptionIndices) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = socket.data.user.uid;
        console.log(uid);
        const updateRes = yield services_1.conversationsService.recordPollResponse(cid, uid, pid, selectedOptionIndices);
        if (updateRes) {
            socket.to(cid).emit('pollResponse', cid, uid, pid, selectedOptionIndices);
        }
    }
    catch (err) {
        console.log(err);
    }
});
const handleEventRsvp = (socket, cid, eid, response) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const uid = socket.data.user.uid;
        const user = yield services_1.usersService.getUser(uid);
        const convo = yield services_1.conversationsService.getConversationInfo(cid);
        const event = (_a = convo.events) === null || _a === void 0 ? void 0 : _a.find((e) => e.id === eid);
        if (!event || !user)
            return;
        const updateRes = yield services_1.conversationsService.recordEventRsvp(cid, eid, uid, response);
        if (updateRes) {
            const userProfile = convo.participants.find((p) => p.id === uid);
            if (userProfile) {
                yield services_1.systemMessagingService.sendEventResponse(convo, event, response, userProfile, socket);
            }
        }
        if (updateRes) {
            socket.to(cid).emit('eventRsvp', cid, eid, uid, response);
        }
    }
    catch (err) {
        console.log(err);
    }
});
const initPoll = (cid, poll, scmService) => {
    services_1.systemMessagingService.schedulePoll(cid, poll, scmService);
};
const removePoll = (pid, scmService) => {
    services_1.systemMessagingService.removePoll(pid, scmService);
};
const initEvent = (cid, event, scmService) => {
    services_1.systemMessagingService.scheduleEvent(cid, event, scmService);
};
const removeEvent = (eid, scmService) => {
    services_1.systemMessagingService.removeEvent(eid, scmService);
};
const handleKeyChange = (socket, cid, newPublicKey, userKeyMap, pnService) => __awaiter(void 0, void 0, void 0, function* () {
    const senderId = socket.data.user.uid;
    try {
        const convo = yield services_1.conversationsService.getConversationInfo(cid);
        yield services_1.secretsService.changeEncryptionKey(convo, newPublicKey, senderId, userKeyMap);
        Object.keys(userKeyMap).map((id) => {
            socket.to(id).emit('keyChange', cid, newPublicKey, userKeyMap);
        });
        if (pnService && socket.data.user.uid) {
            yield pnService.pushNewSecrets(convo, senderId, newPublicKey, userKeyMap);
        }
    }
    catch (err) {
        console.log(err);
    }
});
const deleteMessage = (socket, cid, mid, pnService) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actorId = socket.data.user.uid;
        yield services_1.messagesService.deleteMessage(cid, actorId, mid);
        socket.to(cid).emit('deleteMessage', cid, mid);
        if (pnService) {
            const senderId = socket.data.user.uid;
            const convo = yield services_1.conversationsService.getConversationInfo(cid);
            yield pnService.pushMessageDelete(convo, senderId, mid);
        }
        return;
    }
    catch (err) {
        console.log(err);
        return;
    }
});
const handleUserRoleChanged = (socket, cid, uid, newRole, pnService) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const convo = yield services_1.conversationsService.getConversationInfo(cid);
        const actorId = socket.data.user.uid;
        yield services_1.systemMessagingService.handleUserRoleChanged(convo, actorId, uid, newRole, socket);
        socket.to(cid).emit('userRoleChanged', cid, uid, newRole);
        pnService && pnService.pushRoleChange(cid, uid, newRole);
    }
    catch (err) {
        console.log(err);
    }
});
const conversationsSocket = {
    newConversation,
    newPrivateMessage,
    conversationDelete,
    newUpdateEvent,
    handleNewName,
    handleNewAvatar,
    newParticipants,
    removeParticipant,
    handlePollResponse,
    handleEventRsvp,
    initPoll,
    removePoll,
    initEvent,
    removeEvent,
    handleKeyChange,
    deleteMessage,
    handleUserRoleChanged
};
exports.default = conversationsSocket;
