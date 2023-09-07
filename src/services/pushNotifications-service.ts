/* eslint-disable no-unused-vars */
import usersService from './users-service';
import conversationsService from './conversations-service';
import { Conversation, Message, UserData, SocketEvent, UserConversationProfile, ChatRole } from '../models';
import admin from '../firebase';
import PNPacket from 'models/PNPacket';
import { DecryptedMessage } from 'models/Message';
import { cleanUndefinedFields } from '../utils/request-utils';
import { Notification } from 'firebase-admin/lib/messaging/messaging-api';

export type PushNotificationsService = {
    handledEvents: Set<string> | null;
    init: () => PushNotificationsService;
    getRecipientTokens: (userIds: string[]) => Promise<string[]>;
    getRecipientTokenMap: (userIds: string[]) => Promise<{ [id: string]: string[] }>;
    getMessageBody: (message: Message) => string | undefined;
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
    async getRecipientTokens(userIds: string[]): Promise<string[]> {
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
    async getRecipientTokenMap(userIds: string[]): Promise<{ [id: string]: string[] }> {
        try {
            const users = await usersService.getMultipleUsers(userIds);
            return Object.fromEntries(
                users.reduce((acc: [string, string[]][], user: UserData) => {
                    if (user.pushTokens && user.pushTokens.length > 0) {
                        return acc.concat([[user.id, user.pushTokens]]);
                    }
                    return acc;
                }, [])
            );
        } catch (err) {
            console.log(err);
            return {};
        }
    },
    getMessageBody(message: Message) {
        if (message.encryptionLevel === 'none') {
            const decryptedCast = message as DecryptedMessage;
            if (decryptedCast.content !== undefined) {
                let body = '';
                if (decryptedCast.content.length > 0) {
                    body = decryptedCast.content;
                } else if (decryptedCast.media) {
                    body = 'Media: ';
                }
                return body;
            }
            return undefined;
        }
        return undefined;
    },
    async pushMessage(cid: string, message: Message) {
        if (!this.handledEvents || this.handledEvents.has(message.id)) return;
        this.handledEvents.add(message.id);
        try {
            const convo = await conversationsService.getConversationInfo(cid);
            const recipientProfiles = convo.participants.filter((p) => {
                return p.id !== message.senderId;
            });
            const recipientIds: string[] = recipientProfiles.map((p) => p.id);
            if (recipientIds.length < 1) return;
            // const recipientTokens = await this.getRecipientTokens(recipientIds);
            const recipientTokenMap = await this.getRecipientTokenMap(recipientIds);

            const data: PNPacket = {
                type: 'message',
                stringifiedBody: JSON.stringify({
                    message,
                    cid
                })
            };

            const notification: Notification = {
                title: `${convo.group && message.senderProfile ? convo.name : message.senderProfile?.displayName}`,
                body: `${convo.group && message.senderProfile ? message.senderProfile.displayName + ': ' : ''}${
                    this.getMessageBody(message) || 'encrypted message'
                }`
            };

            await Promise.all(
                recipientIds.map(async (id) => {
                    if (!Object.keys(recipientTokenMap).includes(id)) return;
                    if (recipientTokenMap[id].length < 1) return;
                    const userProfile = convo.participants.find((p) => p.id === id);
                    if (userProfile?.notifications && userProfile.notifications !== 'all') {
                        if (userProfile.notifications === 'none') {
                            return;
                        } else if (userProfile.notifications === 'mentions') {
                            const mentioned = message.mentions?.find((m) => m.id === id);
                            if (!mentioned) return;
                        }
                    }
                    await admin.messaging().sendEachForMulticast({
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
                                notifee_options: {
                                    ...data,
                                    data: {
                                        type: 'message',
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
                })
            );
        } catch (err) {
            console.log(err);
            return;
        }
    },
    async pushNewConvo(convo: Conversation, userId: string, userKeyMap?: { [id: string]: string }) {
        if (!this.handledEvents || this.handledEvents.has(convo.id)) return;
        this.handledEvents.add(convo.id);
        try {
            if (!convo.participants.find((p) => p.id === userId)) return;
            const recipientIds = convo.participants.filter((p) => p.id !== userId).map((r) => r.id);
            const creator = convo.participants.filter((p) => p.id === userId)[0];
            const recipientTokenMap = await this.getRecipientTokenMap(recipientIds);
            if (Object.entries(recipientTokenMap).length < 1) return;

            // should only be called for groupchats
            const notification = JSON.parse(
                JSON.stringify({
                    title: 'You were added to a new conversation',
                    body: `${creator.displayName} added you to ${convo.name}`,
                    imageUrl: convo.avatar?.tinyUri || creator.avatar?.tinyUri || undefined
                })
            );

            await Promise.all(
                recipientIds.map(async (id) => {
                    if (!Object.keys(recipientTokenMap).includes(id)) return;
                    if (recipientTokenMap[id].length < 1) return;
                    const hasKeyMap = userKeyMap && userKeyMap[id] !== undefined;
                    const keyMapForUser = hasKeyMap ? { [id]: userKeyMap[id] } : undefined;
                    const data: PNPacket = {
                        type: 'newConvo',
                        stringifiedBody: JSON.stringify({
                            cid: convo.id
                        })
                        // stringifiedDisplay: JSON.stringify(notification)
                    };

                    await admin.messaging().sendEachForMulticast({
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
                        // notification
                    });
                })
            );
        } catch (err) {
            console.log(err);
            return;
        }
    },
    async pushLike(cid: string, message: Message, userId: string, event: SocketEvent) {
        if (!this.handledEvents || this.handledEvents.has(event.id)) return;
        this.handledEvents.add(event.id);
        if (event.type !== 'newLike') return;
        try {
            const convo = await conversationsService.getConversationInfo(cid);
            const recipient = convo.participants.find((p) => p.id === message.senderId);
            if (!recipient || recipient.notifications === 'none') return;
            const recipientId = message.senderId;
            const recipientTokens = await this.getRecipientTokens([recipientId]);
            const sender = convo.participants.filter((p) => p.id === userId)[0];

            if (recipientTokens.length < 1) return;

            const notification: Notification = {
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
                })
            };

            await admin.messaging().sendEachForMulticast({
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
        } catch (err) {
            console.log(err);
            return;
        }
        return;
    },
    async pushMention(cid: string, mid: string) {
        console.log(cid);
        console.log(mid);
        return;
    },
    async pushNewConvoParticipants(
        convo: Conversation,
        senderProfile: UserConversationProfile,
        newParticipants: UserConversationProfile[],
        userKeyMap
    ) {
        try {
            const recipientIds = newParticipants.map((p) => p.id).filter((id) => id !== senderProfile.id);
            const recipientTokenMap = await this.getRecipientTokenMap(recipientIds);
            if (Object.entries(recipientTokenMap).length < 1) return;

            const notification = {
                title: convo.name,
                body: `${senderProfile.displayName} added you to ${convo.name}`,
                imageUrl: convo.avatar?.tinyUri || undefined
            };

            await Promise.all(
                recipientIds.map(async (id: string) => {
                    if (!(id in recipientTokenMap)) return;
                    if (recipientTokenMap[id].length < 1) return;
                    const hasKeyMap = userKeyMap && id in userKeyMap;
                    const keyMapForUser = hasKeyMap ? { [id]: userKeyMap[id] } : undefined;
                    const data: PNPacket = {
                        type: 'addedToConvo',
                        stringifiedBody: JSON.stringify({
                            cid: convo.id
                        })
                    };
                    await admin.messaging().sendEachForMulticast({
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
                })
            );
            return;
        } catch (err) {
            console.log(err);
            return;
        }
    },
    async pushNewSecrets(convo, senderId, newPublicKey, newKeyMap) {
        try {
            const recipientIds = convo.participants.filter((p) => p.id !== senderId).map((p) => p.id);
            const recipientTokenMap = await this.getRecipientTokenMap(recipientIds);
            if (Object.entries(recipientTokenMap).length < 1) return;

            await Promise.all(
                recipientIds.map(async (id: string) => {
                    if (!(id in recipientTokenMap) || !(id in newKeyMap)) return;
                    if (recipientTokenMap[id].length < 1) return;
                    const keyMapForUser = { [id]: newKeyMap[id] };
                    const data: PNPacket = {
                        type: 'secrets',
                        stringifiedBody: JSON.stringify({
                            cid: convo.id,
                            newPublicKey,
                            newKeyMap: keyMapForUser
                        })
                    };
                    await admin.messaging().sendEachForMulticast({
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
                })
            );

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
            if (recipientTokens.length < 1) return;

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
            if (recipientTokens.length < 1) return;

            const data: PNPacket = {
                type: 'message',
                stringifiedBody: JSON.stringify({
                    cid: convo.id,
                    message: {
                        ...message,
                        senderProfile: message.senderProfile
                            ? {
                                  displayName: message.senderProfile.displayName
                              }
                            : undefined
                    } as Message
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
