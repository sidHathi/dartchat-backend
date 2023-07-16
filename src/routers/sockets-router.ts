import { Conversation, Message, Event, UserConversationProfile } from 'models';
import { Socket } from 'socket.io';
import { messagesSocket, userSocket, conversationsSocket } from '../sockets';
import pushNotificationsService, { PushNotificationsService } from '../services/pushNotifications-service';

const userSocketMap: { [userId: string]: string } = {};
const pnService: PushNotificationsService = pushNotificationsService.init();

const socketsRouter = (socket: Socket) => {
    socket.emit('connected');
    console.log(`a user connected with id ${socket.id}`);
    userSocketMap[socket.data.user.uid] = socket.id;
    console.log(userSocketMap);
    userSocket.onUserAuth(socket);
    socket.on('ping', () => {
        socket.emit('pong');
    });

    socket.on('joinRoom', (rid: string[]) => {
        console.log('joining room with rids: ' + rid);
        socket.join(rid);
    });

    socket.on('newConversation', (newConvo: Conversation) =>
        conversationsSocket.newConversation(socket, newConvo, userSocketMap, pnService)
    );

    socket.on('deleteConversation', (cid: string) => conversationsSocket.conversationDelete(socket, cid));

    socket.on('newMessage', (cid: string, message: Message) =>
        messagesSocket.newMessage(socket, cid, message, pnService)
    );

    socket.on('messagesRead', (cid: string) => userSocket.onReadReceipt(socket, cid));

    socket.on('newLikeEvent', (cid: string, mid: string, event: Event) =>
        messagesSocket.newLikeEvent(socket, cid, mid, event, pnService)
    );

    socket.on('updateConversationDetails', (cid: string) => conversationsSocket.newUpdateEvent(socket, cid));

    socket.on('newConversationUsers', (cid: string, profiles: UserConversationProfile[]) =>
        conversationsSocket.newParticipants(socket, cid, profiles)
    );

    socket.on('removeConversationUser', (cid: string, uid: string) =>
        conversationsSocket.removeParticipant(socket, cid, uid)
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
