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
const sockets_1 = require("../sockets");
const services_1 = require("../services");
const request_utils_1 = require("../utils/request-utils");
const userSocketMap = {};
const pnService = services_1.pushNotificationsService.init();
const scmService = services_1.scheduledMessagesService.init(null, pnService);
const socketsRouter = (socket, server) => {
    userSocketMap[socket.data.user.uid] = socket.id;
    !socket.recovered && sockets_1.userSocket.onUserAuth(socket);
    if (!scmService.socketServer) {
        scmService.setServer(server);
    }
    socket.on('ping', () => __awaiter(void 0, void 0, void 0, function* () {
        yield new Promise((res) => setTimeout(res, 5000));
        socket.emit('pong');
    }));
    socket.on('joinRoom', (rid) => {
        socket.join(rid);
    });
    socket.on('newConversation', (newConvo, recipientKeyMap) => sockets_1.conversationsSocket.newConversation(socket, newConvo, userSocketMap, recipientKeyMap, pnService));
    socket.on('newPrivateMessage', (seedConvo, message, recipientKeyMap) => sockets_1.conversationsSocket.newPrivateMessage(socket, seedConvo, userSocketMap, message, recipientKeyMap, pnService));
    socket.on('deleteConversation', (cid) => sockets_1.conversationsSocket.conversationDelete(socket, cid));
    socket.on('newMessage', (cid, message) => sockets_1.messagesSocket.newMessage(socket, cid, message, pnService));
    socket.on('messagesRead', (cid) => sockets_1.userSocket.onReadReceipt(socket, cid));
    socket.on('newLikeEvent', (cid, mid, event) => sockets_1.messagesSocket.newLikeEvent(socket, cid, mid, event, pnService));
    socket.on('updateConversationDetails', (cid) => sockets_1.conversationsSocket.newUpdateEvent(socket, cid));
    socket.on('newName', (cid, newName) => sockets_1.conversationsSocket.handleNewName(socket, cid, newName));
    socket.on('newAvatar', (cid) => sockets_1.conversationsSocket.handleNewAvatar(socket, cid));
    socket.on('newConversationUsers', (cid, profiles, userKeyMap) => sockets_1.conversationsSocket.newParticipants(socket, cid, profiles, userSocketMap, userKeyMap, pnService));
    socket.on('removeConversationUser', (cid, profile) => sockets_1.conversationsSocket.removeParticipant(socket, cid, profile));
    socket.on('schedulePoll', (cid, poll) => sockets_1.conversationsSocket.initPoll(cid, (0, request_utils_1.parsePoll)(poll), scmService));
    socket.on('pollResponse', (cid, pid, selectedOptionIndices) => sockets_1.conversationsSocket.handlePollResponse(socket, cid, pid, selectedOptionIndices));
    socket.on('scheduleEvent', (cid, event) => sockets_1.conversationsSocket.initEvent(cid, (0, request_utils_1.parseCalEvent)(event), scmService));
    socket.on('eventRsvp', (cid, eid, response) => sockets_1.conversationsSocket.handleEventRsvp(socket, cid, eid, response));
    socket.on('keyChange', (cid, newPublicKey, userKeyMap) => {
        sockets_1.conversationsSocket.handleKeyChange(socket, cid, newPublicKey, userKeyMap, pnService);
    });
    socket.on('deleteMessage', (cid, mid) => sockets_1.conversationsSocket.deleteMessage(socket, cid, mid, pnService));
    socket.on('userRoleChanged', (cid, uid, newRole) => sockets_1.conversationsSocket.handleUserRoleChanged(socket, cid, uid, newRole, pnService));
    socket.on('forceDisconnect', () => {
        socket.disconnect(true);
    });
    socket.on('disconnect', () => {
        if (socket.data.user.uid && socket.data.user.uid in userSocketMap) {
            delete userSocketMap[socket.data.user.uid];
        }
        socket.disconnect();
    });
};
exports.default = socketsRouter;
