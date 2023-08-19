import usersService from './users-service';
import conversationsService from './conversations-service';
import { Conversation, Message, UserData, SocketEvent, UserConversationProfile } from '../models';
import admin from '../firebase';
import PNPacket from 'models/PNPacket';

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
            if ('encryptedFields' in message) return;
            const convo = await conversationsService.getConversationInfo(cid);
            const senderId = message.senderId;
            if (!convo.participants.find((p) => p.id === senderId)) return;
            const sender = convo.participants.filter((p) => p.id === senderId)[0];
            const recipientIds: string[] = convo.participants.filter((p) => p.id !== message.senderId).map((p) => p.id);
            const group = convo.participants.length > 2;

            const data: PNPacket = {
                type: 'message',
                stringifiedBody: JSON.stringify({
                    message,
                    cid
                })
            };

            let unmentionedUserIds = recipientIds;
            const mentionedUserIds: string[] = message.mentions?.map((u) => u.id) || [];
            if (message.mentions) {
                unmentionedUserIds = unmentionedUserIds.filter((id) => !mentionedUserIds.includes(id));
            }
            const mentionNotification = JSON.parse(
                JSON.stringify({
                    title: group ? convo.name : sender.displayName,
                    body: `${group ? sender.displayName : ''} mentioned you ${group ? `in "` + convo.name + `"` : ''}`,
                    imageUrl: convo.avatar?.tinyUri || sender.avatar?.tinyUri || undefined
                })
            );

            if (mentionedUserIds.length > 0) {
                const mentionedUserTokens = await this.getRecipientTokens(mentionedUserIds);
                if (mentionedUserTokens.length > 0) {
                    await admin.messaging().sendEachForMulticast({
                        tokens: mentionedUserTokens,
                        data,
                        notification: mentionNotification
                    });
                }
            }
            if (unmentionedUserIds.length > 0) {
                const unmentionedUserTokens = await this.getRecipientTokens(unmentionedUserIds);
                if (unmentionedUserTokens.length > 0) {
                    await admin.messaging().sendEachForMulticast({
                        tokens: unmentionedUserTokens,
                        data
                        // notification
                    });
                }
            }
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
                data
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
                data
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
                data
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
                data
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
    }
};

export default pushNotificationsService;
