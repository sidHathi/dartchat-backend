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
const users_service_1 = __importDefault(require("./users-service"));
const conversations_service_1 = __importDefault(require("./conversations-service"));
const firebase_1 = __importDefault(require("../firebase"));
const pushNotificationsService = {
    handledEvents: null,
    init() {
        this.handledEvents = new Set();
        return this;
    },
    getRecipientTokens(userIds) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const users = yield users_service_1.default.getMultipleUsers(userIds);
                return users.reduce((acc, user) => {
                    if (user.pushTokens) {
                        return acc.concat(user.pushTokens);
                    }
                    return acc;
                }, []);
            }
            catch (err) {
                console.log(err);
                return [];
            }
        });
    },
    pushMessage(cid, message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.handledEvents || this.handledEvents.has(message.id))
                return;
            this.handledEvents.add(message.id);
            try {
                const convo = yield conversations_service_1.default.getConversationInfo(cid);
                const recipientIds = convo.participants.filter((p) => p.id !== message.senderId).map((p) => p.id);
                const recipientTokens = yield this.getRecipientTokens(recipientIds);
                const data = {
                    type: 'message',
                    stringifiedBody: JSON.stringify({
                        message,
                        cid
                    })
                };
                yield firebase_1.default.messaging().sendEachForMulticast({
                    tokens: recipientTokens,
                    data,
                    android: {
                        priority: 'high'
                    },
                    apns: {
                        payload: {
                            aps: {
                                contentAvailable: true,
                                mutableContent: true,
                                sound: 'default'
                            },
                            notifee_options: Object.assign(Object.assign({}, data), { ios: {
                                    foregroundPresentationOptions: {
                                        alert: true,
                                        badge: true,
                                        sound: true
                                    }
                                } })
                        }
                    }
                });
            }
            catch (err) {
                console.log(err);
                return;
            }
        });
    },
    pushNewConvo(convo, userId, userKeyMap) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.handledEvents || this.handledEvents.has(convo.id))
                return;
            this.handledEvents.add(convo.id);
            try {
                if (!convo.participants.find((p) => p.id === userId))
                    return;
                const recipientIds = convo.participants.filter((p) => p.id !== userId).map((r) => r.id);
                const recipientTokens = yield this.getRecipientTokens(recipientIds);
                const creator = convo.participants.filter((p) => p.id === userId)[0];
                if (recipientTokens.length < 1)
                    return;
                const notification = JSON.parse(JSON.stringify({
                    title: 'You were added to a new conversation',
                    body: `${creator.displayName} added you to ${convo.name}`,
                    imageUrl: ((_a = convo.avatar) === null || _a === void 0 ? void 0 : _a.tinyUri) || ((_b = creator.avatar) === null || _b === void 0 ? void 0 : _b.tinyUri) || undefined
                }));
                const data = {
                    type: 'newConvo',
                    stringifiedBody: JSON.stringify({
                        convo,
                        userKeyMap: userKeyMap || {}
                    }),
                    stringifiedDisplay: JSON.stringify(notification)
                };
                console.log('sending new convo push notification');
                console.log(notification);
                yield firebase_1.default.messaging().sendEachForMulticast({
                    tokens: recipientTokens,
                    data,
                    android: {
                        priority: 'high'
                    },
                    apns: {
                        payload: {
                            aps: {
                                contentAvailable: true,
                                mutableContent: true,
                                sound: 'default'
                            },
                            notifee_options: Object.assign(Object.assign({}, data), { ios: {
                                    foregroundPresentationOptions: {
                                        alert: true,
                                        badge: true,
                                        sound: true
                                    }
                                } })
                        }
                    }
                });
            }
            catch (err) {
                console.log(err);
                return;
            }
        });
    },
    pushLike(cid, message, userId, event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.handledEvents || this.handledEvents.has(event.id))
                return;
            this.handledEvents.add(event.id);
            if (event.type !== 'newLike')
                return;
            try {
                const convo = yield conversations_service_1.default.getConversationInfo(cid);
                if (!convo.participants.find((p) => p.id === userId))
                    return;
                const recipientId = message.senderId;
                const recipientTokens = yield this.getRecipientTokens([recipientId]);
                const sender = convo.participants.filter((p) => p.id === userId)[0];
                if (recipientTokens.length < 1)
                    return;
                const notification = {
                    title: convo.name,
                    body: `${sender.displayName} liked your message`,
                    imageUrl: ((_a = convo.avatar) === null || _a === void 0 ? void 0 : _a.tinyUri) || undefined
                };
                const data = {
                    type: 'like',
                    stringifiedBody: JSON.stringify({
                        cid,
                        event,
                        senderId: userId,
                        mid: message.id
                    }),
                    stringifiedDisplay: JSON.stringify(notification)
                };
                console.log('sending like push notification');
                console.log(notification);
                yield firebase_1.default.messaging().sendEachForMulticast({
                    tokens: recipientTokens,
                    data,
                    android: {
                        priority: 'high'
                    },
                    apns: {
                        payload: {
                            aps: {
                                contentAvailable: true,
                                mutableContent: true,
                                sound: 'default'
                            },
                            notifee_options: Object.assign(Object.assign({}, data), { ios: {
                                    foregroundPresentationOptions: {
                                        alert: true,
                                        badge: true,
                                        sound: true
                                    }
                                } })
                        }
                    }
                });
            }
            catch (err) {
                console.log(err);
                return;
            }
            return;
        });
    },
    pushMention(cid, mid) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(cid);
            console.log(mid);
            return;
        });
    },
    pushNewConvoParticipants(convo, senderProfile, newParticipants, userKeyMap) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const recipientIds = newParticipants.map((p) => p.id).filter((id) => id !== senderProfile.id);
                const recipientTokens = yield this.getRecipientTokens(recipientIds);
                if (recipientTokens.length < 1)
                    return;
                const notification = {
                    title: convo.name,
                    body: `${senderProfile.displayName} added you to ${convo.name}`,
                    imageUrl: ((_a = convo.avatar) === null || _a === void 0 ? void 0 : _a.tinyUri) || undefined
                };
                const data = {
                    type: 'addedToConvo',
                    stringifiedBody: JSON.stringify({
                        convo,
                        userKeyMap: userKeyMap || {}
                    }),
                    stringifiedDisplay: JSON.stringify(notification)
                };
                console.log('sending convoAdd notification');
                console.log(notification);
                yield firebase_1.default.messaging().sendEachForMulticast({
                    tokens: recipientTokens,
                    data,
                    android: {
                        priority: 'high'
                    },
                    apns: {
                        payload: {
                            aps: {
                                contentAvailable: true
                            }
                        }
                    }
                });
                return;
            }
            catch (err) {
                console.log(err);
                return;
            }
        });
    },
    pushNewSecrets(convo, senderId, newPublicKey, newKeyMap) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const recipientIds = convo.participants.filter((p) => p.id !== senderId).map((p) => p.id);
                const recipientTokens = yield this.getRecipientTokens(recipientIds);
                const data = {
                    type: 'secrets',
                    stringifiedBody: JSON.stringify({
                        cid: convo.id,
                        newPublicKey,
                        newKeyMap
                    })
                };
                console.log('sending secrets notification');
                yield firebase_1.default.messaging().sendEachForMulticast({
                    tokens: recipientTokens,
                    data,
                    android: {
                        priority: 'high'
                    },
                    apns: {
                        payload: {
                            aps: {
                                contentAvailable: true
                            }
                        }
                    }
                });
                return;
            }
            catch (err) {
                console.log(err);
                return;
            }
        });
    },
    pushMessageDelete(convo, senderId, mid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const recipientIds = convo.participants.filter((p) => p.id !== senderId).map((p) => p.id);
                const recipientTokens = yield this.getRecipientTokens(recipientIds);
                const data = {
                    type: 'deleteMessage',
                    stringifiedBody: JSON.stringify({
                        cid: convo.id,
                        mid
                    })
                };
                yield firebase_1.default.messaging().sendEachForMulticast({
                    tokens: recipientTokens,
                    data
                });
                return;
            }
            catch (err) {
                console.log(err);
                return;
            }
        });
    },
    pushSystemMessage(convo, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const recipientIds = convo.participants.map((p) => p.id);
                const recipientTokens = yield this.getRecipientTokens(recipientIds);
                const data = {
                    type: 'message',
                    stringifiedBody: JSON.stringify({
                        cid: convo.id,
                        message
                    })
                };
                yield firebase_1.default.messaging().sendEachForMulticast({
                    tokens: recipientTokens,
                    data
                });
            }
            catch (err) {
                console.log(err);
                return;
            }
        });
    },
    pushRoleChange(cid, uid, newRole) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const recipients = yield this.getRecipientTokens([uid]);
                const data = {
                    type: 'roleChanged',
                    stringifiedBody: JSON.stringify({
                        cid,
                        newRole
                    })
                };
                yield firebase_1.default.messaging().sendEachForMulticast({
                    tokens: recipients,
                    data
                });
            }
            catch (err) {
                console.log(err);
                return;
            }
        });
    }
};
exports.default = pushNotificationsService;
