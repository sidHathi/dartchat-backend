import usersService from './users-service';
import conversationsService from './conversations-service';
import { Conversation, Message, UserData, Event } from 'models';
import admin from '../firebase';

export type PushNotificationsService = {
    handledEvents: Set<string> | null;
    init: () => PushNotificationsService;
    getRecipientTokens: (userIds: string[]) => Promise<string[]>;
    pushMessage: (cid: string, message: Message) => Promise<void>;
    pushNewConvo: (convo: Conversation, userId: string) => Promise<void>;
    pushLike: (cid: string, message: Message, userId: string, event: Event) => Promise<void>;
    pushMention: (cid: string, mid: string) => Promise<void>;
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
            const senderId = message.senderId;
            if (!(senderId in convo.participants)) return;
            const sender = convo.participants.filter((p) => p.id === senderId)[0];
            const recipientIds: string[] = convo.participants.filter((p) => p.id !== message.senderId).map((p) => p.id);
            const recipientTokens = await this.getRecipientTokens(recipientIds);
            const group = convo.participants.length > 2;
            if (recipientTokens.length < 1) return;

            const data = {
                messageId: message.id,
                senderName: sender.displayName,
                conversationName: convo.name,
                messageContent: (message.media ? 'Media, ' : '') + message.content,
                avatar: JSON.stringify(convo.avatar || sender.avatar)
            };

            const notification = JSON.parse(
                JSON.stringify({
                    title: group ? convo.name : sender.displayName,
                    body: `${group && sender.displayName + ': '}${message.media && 'Image + '}${message.content}`,
                    imageUrl: convo.avatar || sender.avatar || undefined
                })
            );

            await admin.messaging().sendEachForMulticast({
                tokens: recipientTokens,
                data,
                notification
            });
        } catch (err) {
            console.log(err);
            return;
        }
    },
    pushNewConvo: async function (convo: Conversation, userId: string) {
        if (!this.handledEvents || this.handledEvents.has(convo.id)) return;
        this.handledEvents.add(convo.id);
        try {
            if (!(userId in convo.participants)) return;
            const recipientIds = convo.participants.filter((p) => p.id !== userId).map((r) => r.id);
            const recipientTokens = await this.getRecipientTokens(recipientIds);
            const creator = convo.participants.filter((p) => p.id === userId)[0];
            if (recipientTokens.length < 1) return;

            const data = JSON.parse(JSON.stringify(convo));
            // should only be called for groupchats
            const notification = JSON.parse(
                JSON.stringify({
                    title: 'You were added to a new conversation',
                    body: `${creator.displayName} added you to ${convo.name}`,
                    imageUrl: convo.avatar || creator.avatar || undefined
                })
            );

            await admin.messaging().sendEachForMulticast({
                tokens: recipientTokens,
                data,
                notification
            });
        } catch (err) {
            console.log(err);
            return;
        }
    },
    pushLike: async function (cid: string, message: Message, userId: string, event: Event) {
        if (!this.handledEvents || this.handledEvents.has(event.id)) return;
        this.handledEvents.add(event.id);
        if (event.type !== 'newLike') return;
        try {
            const convo = await conversationsService.getConversationInfo(cid);
            if (!(userId in convo.participants)) return;
            const recipientId = message.senderId;
            const recipientTokens = await this.getRecipientTokens([recipientId]);
            const sender = convo.participants.filter((p) => p.id === userId)[0];

            if (recipientTokens.length < 1) return;

            const data = {
                cid,
                sender: JSON.stringify(sender),
                message: JSON.stringify(message)
            };
            const notification = {
                title: convo.name,
                body: `${sender.displayName} liked your message`,
                imageUrl: JSON.stringify(convo.avatar) || undefined
            };

            await admin.messaging().sendEachForMulticast({
                tokens: recipientTokens,
                data,
                notification
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
    }
};

export default pushNotificationsService;
