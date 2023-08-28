import usersService from './users-service';
import conversationsService from './conversations-service';
import { Conversation, Message, UserData, SocketEvent, UserConversationProfile, ChatRole } from '../models';
import admin from '../firebase';
import PNPacket from 'models/PNPacket';
import { DecryptedMessage } from 'models/Message';

export type PushNotificationsService = {
    handledEvents: Set<string> | null;
    init: () => PushNotificationsService;
    getRecipientTokens: (userIds: string[]) => Promise<string[]>;
    pushMessage: (cid: string, message: Message) => Promise<void>;
    pushNewConvo: (convo: Conversation, userId: string, userKeyMap?: { [id: string]: string }) => Promise<void>;
    pushLike: (cid: string, message: Message, userId: string, event: SocketEvent) => Promise<void>;
    pushMention: (cid: string, mid: string) => Promise<void>;
    pushNewConvoParticipants: (
        convo: Conversation,
        senderProfile: UserConversationProfile,
        newParticipants: UserConversationProfile[],
        userKeyMap?: { [id: string]: string }
    ) => Promise<void>;
    pushNewSecrets: (
        convo: Conversation,
        senderId: string,
        newPublicKey: string,
        newKeyMap: { [id: string]: string }
    ) => Promise<void>;
    pushMessageDelete: (convo: Conversation, senderId: string, mid: string) => Promise<void>;
    // TODO: newDetails push + role change push
    pushSystemMessage: (convo: Conversation, message: DecryptedMessage) => Promise<void>;
    pushRoleChange: (cid: string, uid: string, newRole: ChatRole) => Promise<void>;
};

const pushNotificationsService: PushNotificationsService = {
    handledEvents: null,
    init(): PushNotificationsService {
        this.handledEvents = new Set<string>();
        return this;
    },
    getRecipientTokens: async function (userIds: string[]): Promise<string[]> {
        try {
            const users = await usersService.getMultipleUsers(userIds);
            return users.reduce((acc: string[], user: UserData) => {
                if (user.pushTokens) {
                    return acc.concat(user.pushTokens);
                }
                return acc;
            }, []);
        } catch (err) {
            console.log(err);
            return [];
        }
    },
    pushMessage: async function (cid: string, message: Message) {
        if (!this.handledEvents || this.handledEvents.has(message.id)) return;
        this.handledEvents.add(message.id);
        try {
            const convo = await conversationsService.getConversationInfo(cid);
            const recipientIds: string[] = convo.participants.filter((p) => p.id !== message.senderId).map((p) => p.id);
            const recipientTokens = await this.getRecipientTokens(recipientIds);

            const data: PNPacket = {
                type: 'message',
                stringifiedBody: JSON.stringify({
                    message,
                    cid
                })
            };

            await admin.messaging().sendEachForMulticast({
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
                        notifee_options: {
                            ...data,
                            ios: {
                                foregroundPresentationOptions: {
                                    alert: true,
                                    badge: true,
                                    sound: true
                                }
                            }
                        }
                    }
                }
                // notification
            });
        } catch (err) {
            console.log(err);
            return;
        }
    },
    pushNewConvo: async function (convo: Conversation, userId: string, userKeyMap?: { [id: string]: string }) {
        if (!this.handledEvents || this.handledEvents.has(convo.id)) return;
        this.handledEvents.add(convo.id);
        try {
            if (!convo.participants.find((p) => p.id === userId)) return;
            const recipientIds = convo.participants.filter((p) => p.id !== userId).map((r) => r.id);
            const recipientTokens = await this.getRecipientTokens(recipientIds);
            const creator = convo.participants.filter((p) => p.id === userId)[0];
            if (recipientTokens.length < 1) return;

            // should only be called for groupchats
            const notification = JSON.parse(
                JSON.stringify({
                    title: 'You were added to a new conversation',
                    body: `${creator.displayName} added you to ${convo.name}`,
                    imageUrl: convo.avatar?.tinyUri || creator.avatar?.tinyUri || undefined
                })
            );

            const data: PNPacket = {
                type: 'newConvo',
                stringifiedBody: JSON.stringify({
                    convo,
                    userKeyMap: userKeyMap || {}
                }),
                stringifiedDisplay: JSON.stringify(notification)
            };

            console.log('sending new convo push notification');
            console.log(notification);
            await admin.messaging().sendEachForMulticast({
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
                        notifee_options: {
                            ...data,
                            ios: {
                                foregroundPresentationOptions: {
                                    alert: true,
                                    badge: true,
                                    sound: true
                                }
                            }
                        }
                    }
                }
                // notification
            });
        } catch (err) {
            console.log(err);
            return;
        }
    },
    pushLike: async function (cid: string, message: Message, userId: string, event: SocketEvent) {
        if (!this.handledEvents || this.handledEvents.has(event.id)) return;
        this.handledEvents.add(event.id);
        if (event.type !== 'newLike') return;
        try {
            const convo = await conversationsService.getConversationInfo(cid);
            if (!convo.participants.find((p) => p.id === userId)) return;
            const recipientId = message.senderId;
            const recipientTokens = await this.getRecipientTokens([recipientId]);
            const sender = convo.participants.filter((p) => p.id === userId)[0];

            if (recipientTokens.length < 1) return;

            const notification = {
                title: convo.name,
                body: `${sender.displayName} liked your message`,
                imageUrl: convo.avatar?.tinyUri || undefined
            };
            const data: PNPacket = {
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
            await admin.messaging().sendEachForMulticast({
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
                        notifee_options: {
                            ...data,
                            ios: {
                                foregroundPresentationOptions: {
                                    alert: true,
                                    badge: true,
                                    sound: true
                                }
                            }
                        }
                    }
                }
                // notification
            });
        } catch (err) {
            console.log(err);
            return;
        }
        return;
    },
    pushMention: async function (cid: string, mid: string) {
        console.log(cid);
        console.log(mid);
        return;
    },
    pushNewConvoParticipants: async function (
        convo: Conversation,
        senderProfile: UserConversationProfile,
        newParticipants: UserConversationProfile[],
        userKeyMap
    ) {
        try {
            const recipientIds = newParticipants.map((p) => p.id).filter((id) => id !== senderProfile.id);
            const recipientTokens = await this.getRecipientTokens(recipientIds);
            if (recipientTokens.length < 1) return;

            const notification = {
                title: convo.name,
                body: `${senderProfile.displayName} added you to ${convo.name}`,
                imageUrl: convo.avatar?.tinyUri || undefined
            };
            const data: PNPacket = {
                type: 'addedToConvo',
                stringifiedBody: JSON.stringify({
                    convo,
                    userKeyMap: userKeyMap || {}
                }),
                stringifiedDisplay: JSON.stringify(notification)
            };

            console.log('sending convoAdd notification');
            console.log(notification);
            await admin.messaging().sendEachForMulticast({
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
        } catch (err) {
            console.log(err);
            return;
        }
    },
    async pushNewSecrets(convo, senderId, newPublicKey, newKeyMap) {
        try {
            const recipientIds = convo.participants.filter((p) => p.id !== senderId).map((p) => p.id);
            const recipientTokens = await this.getRecipientTokens(recipientIds);

            const data: PNPacket = {
                type: 'secrets',
                stringifiedBody: JSON.stringify({
                    cid: convo.id,
                    newPublicKey,
                    newKeyMap
                })
            };

            console.log('sending secrets notification');
            await admin.messaging().sendEachForMulticast({
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
        } catch (err) {
            console.log(err);
            return;
        }
    },
    async pushMessageDelete(convo: Conversation, senderId: string, mid: string) {
        try {
            const recipientIds = convo.participants.filter((p) => p.id !== senderId).map((p) => p.id);
            const recipientTokens = await this.getRecipientTokens(recipientIds);

            const data: PNPacket = {
                type: 'deleteMessage',
                stringifiedBody: JSON.stringify({
                    cid: convo.id,
                    mid
                })
            };

            await admin.messaging().sendEachForMulticast({
                tokens: recipientTokens,
                data
            });
            return;
        } catch (err) {
            console.log(err);
            return;
        }
    },
    async pushSystemMessage(convo, message) {
        try {
            const recipientIds = convo.participants.map((p) => p.id);
            const recipientTokens = await this.getRecipientTokens(recipientIds);

            const data: PNPacket = {
                type: 'message',
                stringifiedBody: JSON.stringify({
                    cid: convo.id,
                    message
                })
            };

            await admin.messaging().sendEachForMulticast({
                tokens: recipientTokens,
                data
            });
        } catch (err) {
            console.log(err);
            return;
        }
    },
    async pushRoleChange(cid, uid, newRole) {
        try {
            const recipients = await this.getRecipientTokens([uid]);

            const data: PNPacket = {
                type: 'roleChanged',
                stringifiedBody: JSON.stringify({
                    cid,
                    newRole
                })
            };

            await admin.messaging().sendEachForMulticast({
                tokens: recipients,
                data
            });
        } catch (err) {
            console.log(err);
            return;
        }
    }
};

export default pushNotificationsService;
