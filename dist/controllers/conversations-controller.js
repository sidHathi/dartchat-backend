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
const pagination_1 = require("../pagination");
const request_utils_1 = require("../utils/request-utils");
const conversation_utils_1 = require("../utils/conversation-utils");
const messageTransferLimit = 10000;
const getConversation = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const cursor = (0, pagination_1.getCursorForQuery)(req);
        const convo = yield services_1.conversationsService.getConversation(cid, cursor);
        if (!convo) {
            res.status(404).send();
            return;
        }
        const lastMessage = convo.messages.length > 0 ? convo.messages[convo.messages.length - 1] : null;
        const nextCursorString = lastMessage && convo.messages.length >= cursor.size
            ? (0, pagination_1.encodeCursor)((0, pagination_1.getNextCursor)(cursor, lastMessage.timestamp))
            : 'none';
        res.set('cursor', nextCursorString);
        res.status(200).send(convo);
    }
    catch (err) {
        next(err);
    }
});
const getConversationInfo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const convo = yield services_1.conversationsService.getConversationInfo(cid);
        if (!convo) {
            res.status(404).send();
            return;
        }
        res.status(200).send(convo);
    }
    catch (err) {
        next(err);
    }
});
const getConversationMessages = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const cursor = (0, pagination_1.getCursorForQuery)(req);
        const messages = yield services_1.messagesService.getConversationMessages(cid, cursor);
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const nextCursor = lastMessage && messages.length >= cursor.size
            ? (0, pagination_1.encodeCursor)((0, pagination_1.getNextCursor)(cursor, lastMessage.timestamp))
            : 'none';
        res.set('cursor', nextCursor);
        res.status(200).send(messages);
    }
    catch (err) {
        next(err);
    }
});
const getConversationMessagesToDate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.params.id || !req.body.date) {
            res.status(400).send();
            return;
        }
        const cid = req.params.id;
        const date = new Date(Date.parse(req.body.date));
        const cursor = (0, pagination_1.getCursorForQuery)(req);
        const messages = yield services_1.messagesService.getConversationMessagesToDate(cid, cursor, date);
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const nextCursor = lastMessage && messages.length >= cursor.size
            ? (0, pagination_1.encodeCursor)((0, pagination_1.getNextCursor)(cursor, lastMessage.timestamp))
            : 'none';
        res.set('cursor', nextCursor);
        res.status(200).send(messages);
    }
    catch (err) {
        next(err);
    }
});
const getConversationMessage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.params.cid || !req.params.mid) {
            res.status(404).send();
            return;
        }
        const message = yield services_1.messagesService.getConversationMessage(req.params.cid, req.params.mid);
        res.status(200).send(message);
    }
    catch (err) {
        const message = (0, request_utils_1.getErrorMessage)(err);
        if (message === 'no such message') {
            res.status(404).send(message);
        }
        next(err);
    }
});
const deleteConversation = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const cid = req.params.id;
        const uid = (_a = res.locals) === null || _a === void 0 ? void 0 : _a.uid;
        const delRes = yield services_1.conversationsService.deleteConversation(cid, uid);
        res.status(200).send(delRes);
    }
    catch (err) {
        next(err);
    }
});
const updateConversationProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const newProfile = req.body;
        const updateRes = yield services_1.conversationsService.updateConversationProfile(cid, newProfile);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400);
    }
    catch (err) {
        next(err);
    }
});
const updateConversationDetails = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const updates = req.body;
        const updateRes = yield services_1.conversationsService.updateConversationDetails(cid, updates);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send();
    }
    catch (err) {
        next(err);
    }
});
const updateUserNotStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const uid = res.locals.uid;
        const newStatus = req.body.status;
        const updateRes = yield services_1.conversationsService.updateUserNotStatus(cid, uid, newStatus);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send();
    }
    catch (err) {
        next(err);
    }
});
const addUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const newUserProfiles = req.body;
        const additionRes = yield services_1.conversationsService.addUsers(cid, newUserProfiles);
        res.status(200).send(additionRes);
    }
    catch (err) {
        next(err);
    }
});
const removeUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const actorId = res.locals.uid;
        const uid = req.body.userId;
        const deletionRes = yield services_1.conversationsService.removeUser(cid, actorId, uid, false);
        res.status(200).send(deletionRes);
    }
    catch (err) {
        next(err);
    }
});
const joinConvo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const uid = res.locals.uid;
        const user = yield services_1.usersService.getUser(uid);
        const profiles = [(0, conversation_utils_1.getProfileForUser)(user)];
        const additionRes = yield services_1.conversationsService.addUsers(cid, profiles);
        res.status(200).send(additionRes);
    }
    catch (err) {
        next(err);
    }
});
const getConversationsInfo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cids = req.body;
        if (!cids) {
            res.status(404).send();
            return;
        }
        const conversations = yield services_1.conversationsService.getConversationsInfo(cids);
        res.status(200).send(conversations);
    }
    catch (err) {
        next(err);
    }
});
const leaveConvo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const uid = res.locals.uid;
        const deletionRes = yield services_1.conversationsService.removeUser(cid, uid, uid, true);
        res.status(200).send(deletionRes);
    }
    catch (err) {
        next(err);
    }
});
const addPoll = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const poll = (0, request_utils_1.parsePoll)(req.body);
        const updateRes = yield services_1.conversationsService.addPoll(cid, poll);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send('server update failed');
    }
    catch (err) {
        next(err);
    }
});
const recordPollResponse = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const uid = res.locals.uid;
        const { pid, selectedOptionIndices } = req.body;
        const updateRes = yield services_1.conversationsService.recordPollResponse(cid, uid, pid, selectedOptionIndices);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send('server update failed');
    }
    catch (err) {
        next(err);
    }
});
const getPoll = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.cid;
        const pid = req.params.pid;
        const poll = yield services_1.conversationsService.getPoll(cid, pid);
        if (poll) {
            res.status(200).send(poll);
            return;
        }
        res.status(404).send('no matching poll found');
    }
    catch (err) {
        next(err);
    }
});
const addEvent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const event = (0, request_utils_1.parseEvent)(req.body);
        const updateRes = yield services_1.conversationsService.addEvent(cid, event);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send('server update failed');
    }
    catch (err) {
        next(err);
    }
});
const recordEventRsvp = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const uid = res.locals.uid;
        const { eid, response } = req.body;
        const updateRes = yield services_1.conversationsService.recordEventRsvp(cid, eid, uid, response);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send('server update failed');
    }
    catch (err) {
        next(err);
    }
});
const getEvent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.cid;
        const eid = req.params.eid;
        const event = yield services_1.conversationsService.getEvent(cid, eid);
        if (event) {
            res.status(200).send(event);
            return;
        }
        res.status(404).send('no matching poll found');
    }
    catch (err) {
        next(err);
    }
});
const changeLikeIcon = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.cid;
        const newIcon = req.body;
        const updateRes = yield services_1.conversationsService.changeLikeIcon(cid, newIcon);
        res.status(200).send(updateRes);
    }
    catch (err) {
        next(err);
    }
});
const resetLikeIcon = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.cid;
        const updateRes = yield services_1.conversationsService.resetLikeIcon(cid);
        res.status(200).send(updateRes);
    }
    catch (err) {
        next(err);
    }
});
const getGalleryMessages = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const cursor = (0, pagination_1.getCursorForQuery)(req);
        const messages = yield services_1.messagesService.getGalleryMessages(cid, cursor);
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const nextCursor = lastMessage && messages.length >= cursor.size
            ? (0, pagination_1.encodeCursor)((0, pagination_1.getNextCursor)(cursor, lastMessage.timestamp))
            : 'none';
        res.set('cursor', nextCursor);
        res.status(200).send(messages);
    }
    catch (err) {
        next(err);
    }
});
const getReencryptionData = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const dateLimit = req.body.dateLimit ? new Date(Date.parse(req.body.dateLimit)) : undefined;
        const largeMessageList = yield services_1.messagesService.getLargeMessageList(cid, messageTransferLimit, dateLimit);
        const encryptionData = yield services_1.secretsService.getReencryptionFieldsForMessageList(largeMessageList);
        res.status(200).send(encryptionData);
    }
    catch (err) {
        console.log(err);
        return next(err);
    }
});
const pushReencryptedMessages = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const reencryptionData = req.body;
        const convo = yield services_1.conversationsService.getConversationInfo(cid);
        yield services_1.messagesService.reencryptMessages(convo, reencryptionData);
        res.status(200).send();
    }
    catch (err) {
        next(err);
    }
});
const changeEncryptionKey = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.id;
        const uid = res.locals.uid;
        const { publicKey, userKeyMap, keyInfo } = req.body;
        const convo = yield services_1.conversationsService.getConversationInfo(cid);
        if (yield services_1.secretsService.changeEncryptionKey(convo, publicKey, uid, userKeyMap, keyInfo)) {
            res.status(200).send();
        }
        res.status(400).send('Key update failed');
    }
    catch (err) {
        next(err);
    }
});
const deleteMessage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.cid;
        const mid = req.params.mid;
        const actorId = res.locals.uid;
        const deletionRes = yield services_1.messagesService.deleteMessage(cid, actorId, mid);
        res.status(200).send(deletionRes);
    }
    catch (err) {
        next(err);
    }
});
const updateUserRole = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cid = req.params.cid;
        const actorId = res.locals.uid;
        const uid = req.body.uid;
        const newRole = req.body.newRole;
        const convoUpdate = yield services_1.conversationsService.changeConversationUserRole(cid, actorId, uid, newRole);
        yield services_1.usersService.updatePreviewRole(uid, cid, newRole);
        res.status(200).send(convoUpdate);
    }
    catch (err) {
        next(err);
    }
});
const conversationsController = {
    getConversation,
    getConversationInfo,
    getConversationMessages,
    getConversationMessagesToDate,
    getConversationMessage,
    deleteConversation,
    updateConversationProfile,
    updateConversationDetails,
    updateUserNotStatus,
    addUsers,
    removeUser,
    joinConvo,
    leaveConvo,
    recordPollResponse,
    addPoll,
    getPoll,
    addEvent,
    recordEventRsvp,
    getEvent,
    changeLikeIcon,
    resetLikeIcon,
    getGalleryMessages,
    getConversationsInfo,
    getReencryptionData,
    pushReencryptedMessages,
    changeEncryptionKey,
    deleteMessage,
    updateUserRole
};
exports.default = conversationsController;
