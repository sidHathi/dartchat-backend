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
const newMessage = (socket, cid, message, pnService) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deliveredMessage = Object.assign(Object.assign({}, message), { delivered: true });
        yield services_1.messagesService.storeNewMessage(cid, deliveredMessage);
        socket.to(cid).emit('newMessage', cid, deliveredMessage);
        if (pnService !== undefined) {
            yield pnService.pushMessage(cid, deliveredMessage);
        }
        socket.emit('messageDelivered', cid, message.id);
        return deliveredMessage;
    }
    catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
});
const newLikeEvent = (socket, cid, mid, event, pnService) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = socket.data.user.uid;
        socket.to(cid).emit('newLikeEvent', cid, mid, uid, event);
        const message = yield services_1.messagesService.storeNewLike(cid, mid, uid, event.type);
        if (pnService) {
            yield pnService.pushLike(cid, message, uid, event);
        }
        return true;
    }
    catch (err) {
        return Promise.reject(err);
    }
});
const messagesSocket = {
    newMessage,
    newLikeEvent
};
exports.default = messagesSocket;
