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
const firebase_1 = __importDefault(require("../firebase"));
const socketAuth = (socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = socket.handshake.auth;
    if (!token)
        next(new Error('unauthorized'));
    try {
        const decodedToken = yield firebase_1.default.auth().verifyIdToken(token);
        socket.data.user = decodedToken;
        next();
    }
    catch (err) {
        console.log('socket auth failed');
        socket.emit('authFailure');
        socket.disconnect(true);
        next(new Error('unauthorized'));
    }
});
exports.default = socketAuth;
