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
    getRecipientTokenMap(userIds) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const users = yield users_service_1.default.getMultipleUsers(userIds);
                return Object.fromEntries(users.reduce((acc, user) => {
                    if (user.pushTokens && user.pushTokens.length > 0) {
                        return acc.concat([[user.id, user.pushTokens]]);
                    }
                    return acc;
                }, []));
            }
            catch (err) {
                console.log(err);
                return {};
            }
        });
    },
    getMessageBody(message) {
        if (message.encryptionLevel === 'none') {
            const decryptedCast = message;
            if (decryptedCast.content !== undefined) {
                let body = '';
                if (decryptedCast.content.length > 0) {
                    body = decryptedCast.content;
                }
                else if (decryptedCast.media) {
                    body = 'Media: ';
                }
                return body;
            }
            return undefined;
        }
        return undefined;
    },
    pushMessage(cid, message) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.handledEvents || this.handledEvents.has(message.id))
                return;
            this.handledEvents.add(message.id);
            try {
                const convo = yield conversations_service_1.default.getConversationInfo(cid);
                const recipientProfiles = convo.participants.filter((p) => {
                    return p.id !== message.senderId;
                });
                const recipientIds = recipientProfiles.map((p) => p.id);
                if (recipientIds.length < 1)
                    return;
                const recipientTokenMap = yield this.getRecipientTokenMap(recipientIds);
                const data = {
                    type: 'message',
                    stringifiedBody: JSON.stringify({
                        message,
                        cid
                    })
                };
                const notification = {
                    title: `${(convo.group && message.senderProfile) || message.messageType === 'system'
                        ? convo.name
                        : (_a = message.senderProfile) === null || _a === void 0 ? void 0 : _a.displayName}`,
                    body: `${convo.group && message.senderProfile ? message.senderProfile.displayName + ': ' : ''}${this.getMessageBody(message) || 'encrypted message'}`
                };
                yield Promise.all(recipientIds.map((id) => __awaiter(this, void 0, void 0, function* () {
                    var _b;
                    if (!Object.keys(recipientTokenMap).includes(id))
                        return;
                    if (recipientTokenMap[id].length < 1)
                        return;
                    const userProfile = convo.participants.find((p) => p.id === id);
                    if ((userProfile === null || userProfile === void 0 ? void 0 : userProfile.notifications) && userProfile.notifications !== 'all') {
                        if (userProfile.notifications === 'none') {
                            return;
                        }
                        else if (userProfile.notifications === 'mentions') {
                            const mentioned = (_b = message.mentions) === null || _b === void 0 ? void 0 : _b.find((m) => m.id === id);
                            if (!mentioned)
                                return;
                        }
                    }
                    yield firebase_1.default.messaging().sendEachForMulticast({
                        tokens: recipientTokenMap[id],
                        data: {
                            mid: message.id
                        },
                        notification,
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
                                notifee_options: Object.assign(Object.assign({}, data), { data: {
                                        type: 'message',
                                        cid,
                                        mid: message.id
                                    }, ios: {
                                        sound: 'default',
                                        interruptionLevel: 'active'
                                    } })
                            }
                        }
                    });
                })));
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
                const creator = convo.participants.filter((p) => p.id === userId)[0];
                const recipientTokenMap = yield this.getRecipientTokenMap(recipientIds);
                if (Object.entries(recipientTokenMap).length < 1)
                    return;
                const notification = JSON.parse(JSON.stringify({
                    title: 'You were added to a new conversation',
                    body: `${creator.displayName} added you to ${convo.name}`,
                    imageUrl: ((_a = convo.avatar) === null || _a === void 0 ? void 0 : _a.tinyUri) || ((_b = creator.avatar) === null || _b === void 0 ? void 0 : _b.tinyUri) || undefined
                }));
                yield Promise.all(recipientIds.map((id) => __awaiter(this, void 0, void 0, function* () {
                    if (!Object.keys(recipientTokenMap).includes(id))
                        return;
                    if (recipientTokenMap[id].length < 1)
                        return;
                    const hasKeyMap = userKeyMap && userKeyMap[id] !== undefined;
                    const keyMapForUser = hasKeyMap ? { [id]: userKeyMap[id] } : undefined;
                    const data = {
                        type: 'newConvo',
                        stringifiedBody: JSON.stringify({
                            cid: convo.id
                        })
                    };
                    yield firebase_1.default.messaging().sendEachForMulticast({
                        tokens: recipientTokenMap[id],
                        data,
                        notification,
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
                                notifee_options: {
                                    type: 'newConvo',
                                    data: {
                                        type: 'newConvo',
                                        cid: convo.id
                                    },
                                    ios: {
                                        sound: 'default',
                                        interruptionLevel: 'active'
                                    }
                                }
                            }
                        }
                    });
                })));
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
                const recipient = convo.participants.find((p) => p.id === message.senderId);
                if (!recipient || recipient.notifications === 'none')
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
                    })
                };
                yield firebase_1.default.messaging().sendEachForMulticast({
                    tokens: recipientTokens,
                    data,
                    notification,
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
                            notifee_options: {
                                data: {
                                    type: 'like',
                                    cid,
                                    mid: message.id
                                },
                                ios: {
                                    sound: 'default',
                                    interruptionLevel: 'active'
                                }
                            }
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
                const recipientTokenMap = yield this.getRecipientTokenMap(recipientIds);
                if (Object.entries(recipientTokenMap).length < 1)
                    return;
                const notification = {
                    title: convo.name,
                    body: `${senderProfile.displayName} added you to ${convo.name}`,
                    imageUrl: ((_a = convo.avatar) === null || _a === void 0 ? void 0 : _a.tinyUri) || undefined
                };
                yield Promise.all(recipientIds.map((id) => __awaiter(this, void 0, void 0, function* () {
                    if (!(id in recipientTokenMap))
                        return;
                    if (recipientTokenMap[id].length < 1)
                        return;
                    const hasKeyMap = userKeyMap && id in userKeyMap;
                    const keyMapForUser = hasKeyMap ? { [id]: userKeyMap[id] } : undefined;
                    const data = {
                        type: 'addedToConvo',
                        stringifiedBody: JSON.stringify({
                            cid: convo.id
                        })
                    };
                    yield firebase_1.default.messaging().sendEachForMulticast({
                        tokens: recipientTokenMap[id],
                        data,
                        notification,
                        android: {
                            priority: 'high'
                        },
                        apns: {
                            payload: {
                                aps: {
                                    contentAvailable: true,
                                    mutableContent: true
                                },
                                notifee_options: {
                                    type: 'addedToConvo',
                                    data: {
                                        type: 'addedToConvo',
                                        cid: convo.id
                                    },
                                    ios: {
                                        sound: 'default',
                                        interruptionLevel: 'active'
                                    }
                                }
                            }
                        }
                    });
                })));
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
                const recipientTokenMap = yield this.getRecipientTokenMap(recipientIds);
                if (Object.entries(recipientTokenMap).length < 1)
                    return;
                yield Promise.all(recipientIds.map((id) => __awaiter(this, void 0, void 0, function* () {
                    if (!(id in recipientTokenMap) || !(id in newKeyMap))
                        return;
                    if (recipientTokenMap[id].length < 1)
                        return;
                    const keyMapForUser = { [id]: newKeyMap[id] };
                    const data = {
                        type: 'secrets',
                        stringifiedBody: JSON.stringify({
                            cid: convo.id,
                            newPublicKey,
                            newKeyMap: keyMapForUser
                        })
                    };
                    yield firebase_1.default.messaging().sendEachForMulticast({
                        tokens: recipientTokenMap[id],
                        data,
                        android: {
                            priority: 'high'
                        },
                        apns: {
                            payload: {
                                aps: {
                                    contentAvailable: true,
                                    mutableContent: true
                                }
                            }
                        }
                    });
                })));
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
                if (recipientTokens.length < 1)
                    return;
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
                if (recipientTokens.length < 1)
                    return;
                const notification = {
                    title: convo.name,
                    body: message.content
                };
                const data = {
                    type: 'message',
                    stringifiedBody: JSON.stringify({
                        cid: convo.id,
                        message: Object.assign(Object.assign({}, message), { senderProfile: message.senderProfile
                                ? {
                                    displayName: message.senderProfile.displayName
                                }
                                : undefined })
                    })
                };
                yield firebase_1.default.messaging().sendEachForMulticast({
                    tokens: recipientTokens,
                    data,
                    notification
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
