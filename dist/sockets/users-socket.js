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
const onUserAuth = (socket) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const uid = socket.data.user.uid;
        const user = yield services_1.usersService.getUser(uid);
        (_a = user.conversations) === null || _a === void 0 ? void 0 : _a.map((c) => {
            socket.join(c.cid);
        });
        socket.join(uid);
        return user;
    }
    catch (err) {
        return null;
    }
});
const onReadReceipt = (socket, cid) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uid = socket.data.user.uid;
        const res = yield services_1.usersService.handleReadReceipt(uid, cid);
        if (res)
            return res;
        return null;
    }
    catch (err) {
        return null;
    }
});
const userSocket = {
    onUserAuth,
    onReadReceipt
};
exports.default = userSocket;
