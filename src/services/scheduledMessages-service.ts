import { Server } from 'socket.io';
import { db } from '../firebase';
import { Message, ScheduledMessage } from '../models';
import messagesService from './messages-service';
import { Job, scheduleJob } from 'node-schedule';
import { PushNotificationsService } from './pushNotifications-service';

const scheduleCol = db.collection('scheduledMessages');

export type ScheduledMessagesService = {
    scheduledMessages: Job[] | null;
    socketServer: Server | null;
    pnService: PushNotificationsService | null;
    init: (socketServer: Server | null, pnService: PushNotificationsService | null) => ScheduledMessagesService;
    scheduleSend: (message: ScheduledMessage) => void;
    setServer: (server: Server) => void;
    addMessage: (cid: string, message: Message, date: Date) => void;
    removeMessage: (mid: string) => void;
};

const scheduledMessagesService: ScheduledMessagesService = {
    scheduledMessages: null,
    socketServer: null,
    pnService: null,
    scheduleSend(scMessage: ScheduledMessage) {
        if (!this.scheduledMessages) return;
        const sendJob = scheduleJob(scMessage.id, scMessage.time, async () => {
            try {
                await messagesService.storeNewMessage(scMessage.cid, scMessage.message);
                if (this.socketServer) {
                    this.socketServer.to(scMessage.cid).emit('newMessage', scMessage.cid, scMessage.message);
                }
                if (this.pnService) {
                    await this.pnService.pushMessage(scMessage.cid, scMessage.message);
                }
                await scheduleCol.doc(scMessage.id).delete();
            } catch (err) {
                console.log(err);
            }
        });
        this.scheduledMessages.push(sendJob);
    },
    init(socketServer: Server | null, pnService: PushNotificationsService | null): ScheduledMessagesService {
        this.scheduledMessages = [];
        this.socketServer = socketServer;
        this.pnService = pnService;
        try {
            scheduleCol
                .orderBy('time')
                .get()
                .then((docs) => {
                    const idSet = new Set<string>([]);
                    docs.forEach((doc) => {
                        const message = doc.data() as ScheduledMessage;
                        if (message && idSet.has(message.id)) {
                            return;
                        }
                        this.scheduleSend(message);
                    });
                })
                .catch((err) => {
                    console.log(err);
                });
        } catch (err) {
            console.log(err);
        }
        return this;
    },
    setServer(server: Server) {
        this.socketServer = server;
    },
    addMessage: function (cid: string, message: Message, time: Date) {
        if (!this.scheduledMessages?.find((m) => m.name === message.id)) {
            const scMessage: ScheduledMessage = {
                id: message.id,
                cid,
                message,
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
    },
    removeMessage: function (mid: string) {
        const match = this.scheduledMessages?.find((m) => m.name === mid);
        if (match) match.cancel();
        try {
            scheduleCol
                .doc(mid)
                .delete()
                .catch((err) => {
                    console.log(err);
                });
        } catch (err) {
            console.log(err);
        }
    }
};

export default scheduledMessagesService;
