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
const messages_service_1 = __importDefault(require("./messages-service"));
const node_schedule_1 = require("node-schedule");
const request_utils_1 = require("../utils/request-utils");
const scheduleCol = firebase_1.db.collection(process.env.FIREBASE_SCM_COL || 'scheduledMessages-dev');
const scheduledMessagesService = {
    scheduledMessages: null,
    socketServer: null,
    pnService: null,
    scheduleSend(scMessage) {
        if (!this.scheduledMessages)
            return;
        const sendJob = (0, node_schedule_1.scheduleJob)(scMessage.id, scMessage.time, () => __awaiter(this, void 0, void 0, function* () {
            try {
                if (Math.abs(new Date().getTime() - scMessage.time.getTime()) > 1000 * 60 * 6)
                    return;
                yield messages_service_1.default.storeNewMessage(scMessage.cid, scMessage.message);
                if (this.socketServer) {
                    this.socketServer.to(scMessage.cid).emit('newMessage', scMessage.cid, scMessage.message);
                }
                if (this.pnService) {
                    yield this.pnService.pushMessage(scMessage.cid, scMessage.message);
                }
                yield scheduleCol.doc(scMessage.id).delete();
            }
            catch (err) {
                console.log(err);
            }
        }));
        this.scheduledMessages.push(sendJob);
    },
    init(socketServer, pnService) {
        this.scheduledMessages = [];
        this.socketServer = socketServer;
        this.pnService = pnService;
        try {
            scheduleCol
                .orderBy('time')
                .get()
                .then((docs) => {
                const idSet = new Set([]);
                docs.forEach((doc) => {
                    const message = (0, request_utils_1.parseDBSCMessage)(doc.data());
                    if (message && idSet.has(message.id)) {
                        return;
                    }
                    this.scheduleSend(message);
                });
            })
                .catch((err) => {
                console.log(err);
            });
        }
        catch (err) {
            console.log(err);
        }
        return this;
    },
    setServer(server) {
        this.socketServer = server;
    },
    addMessage(cid, message, time) {
        var _a;
        if (!message)
            return;
        const timedMessage = Object.assign(Object.assign({}, message), { timestamp: time });
        try {
            if (!((_a = this.scheduledMessages) === null || _a === void 0 ? void 0 : _a.find((m) => m && m.name === timedMessage.id))) {
                const scMessage = {
                    id: timedMessage.id,
                    cid,
                    message: timedMessage,
                    time
                };
                scheduleCol
                    .doc(message.id)
                    .set(scMessage)
                    .then(() => {
                    this.scheduleSend(scMessage);
                })
                    .catch((err) => {
                    console.log(err);
                });
            }
        }
        catch (err) {
            console.log(err);
        }
    },
    removeMessage(mid) {
        var _a;
        const match = (_a = this.scheduledMessages) === null || _a === void 0 ? void 0 : _a.find((m) => m.name === mid);
        if (match)
            match.cancel();
        try {
            scheduleCol
                .doc(mid)
                .delete()
                .catch((err) => {
                console.log(err);
            });
        }
        catch (err) {
            console.log(err);
        }
    }
};
exports.default = scheduledMessagesService;
