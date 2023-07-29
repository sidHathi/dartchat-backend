import { CalendarEvent, Conversation, Message, Poll, SocketEvent, UserConversationProfile } from '../models';
import { Server, Socket } from 'socket.io';
import { messagesSocket, userSocket, conversationsSocket } from '../sockets';
import {
    pushNotificationsService,
    PushNotificationsService,
    ScheduledMessagesService,
    scheduledMessagesService
} from '../services';
import { parseCalEvent, parsePoll } from '../utils/request-utils';

const userSocketMap: { [userId: string]: string } = {};
const pnService: PushNotificationsService = pushNotificationsService.init();
const scmService: ScheduledMessagesService = scheduledMessagesService.init(null, pnService);

const socketsRouter = (socket: Socket, server: Server) => {
    console.log(`a user connected with id ${socket.id}`);
    userSocketMap[socket.data.user.uid] = socket.id;
    console.log(userSocketMap);
    userSocket.onUserAuth(socket);
    if (!scmService.socketServer) {
        scmService.setServer(server);
    }

    socket.on('ping', async () => {
        await new Promise((res) => setTimeout(res, 5000));
        socket.emit('pong');
    });

    socket.on('joinRoom', (rid: string[]) => {
        console.log('joining room with rids: ' + rid);
        socket.join(rid);
    });

    socket.on('newConversation', (newConvo: Conversation) =>
        conversationsSocket.newConversation(socket, newConvo, userSocketMap, pnService)
    );

    socket.on('newPrivateMessage', (seedConvo: Conversation, message: Message) =>
        conversationsSocket.newPrivateMessage(socket, seedConvo, userSocketMap, message, pnService)
    );

    socket.on('deleteConversation', (cid: string) => conversationsSocket.conversationDelete(socket, cid));

    socket.on('newMessage', (cid: string, message: Message) =>
        messagesSocket.newMessage(socket, cid, message, pnService)
    );

    socket.on('messagesRead', (cid: string) => userSocket.onReadReceipt(socket, cid));

    socket.on('newLikeEvent', (cid: string, mid: string, event: SocketEvent) =>
        messagesSocket.newLikeEvent(socket, cid, mid, event, pnService)
    );

    socket.on('updateConversationDetails', (cid: string) => conversationsSocket.newUpdateEvent(socket, cid));

    socket.on('newName', (cid: string, newName: string) => conversationsSocket.handleNewName(socket, cid, newName));

    socket.on('newAvatar', (cid: string) => conversationsSocket.handleNewAvatar(socket, cid));

    socket.on('newConversationUsers', (cid: string, profiles: UserConversationProfile[]) =>
        conversationsSocket.newParticipants(socket, cid, profiles, userSocketMap)
    );

    socket.on('removeConversationUser', (cid: string, profile: UserConversationProfile) =>
        conversationsSocket.removeParticipant(socket, cid, profile)
    );

    socket.on('schedulePoll', (cid: string, poll: Poll) =>
        conversationsSocket.initPoll(cid, parsePoll(poll), scmService)
    );

    socket.on('pollResponse', (cid: string, pid: string, selectedOptionIndices: number[]) =>
        conversationsSocket.handlePollResponse(socket, cid, pid, selectedOptionIndices)
    );

    socket.on('scheduleEvent', (cid: string, event: CalendarEvent) =>
        conversationsSocket.initEvent(cid, parseCalEvent(event), scmService)
    );

    socket.on('eventRsvp', (cid: string, eid: string, response: string) =>
        conversationsSocket.handleEventRsvp(socket, cid, eid, response)
    );

    socket.on('forceDisconnect', () => {
        socket.disconnect(true);
    });

    socket.on('disconnect', () => {
        console.log(`user disconnected`);
        if (socket.data.user.uid && socket.data.user.uid in userSocketMap) {
            delete userSocketMap[socket.data.user.uid];
        }
        socket.disconnect();
    });
};

export default socketsRouter;
