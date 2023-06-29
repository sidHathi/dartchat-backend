import { Conversation, Message } from 'models';
import { Socket } from 'socket.io';
import { conversationSocket, userSocket } from '../sockets';

const socketUserMap: { [socketId: string]: string } = {};

const socketsRouter = (socket: Socket) => {
    console.log(`a user connected with id ${socket.id}`);
    socketUserMap[socket.id] = socket.data.user.uid;
    console.log(socketUserMap);
    userSocket.onUserAuth(socket);

    socket.on('joinRoom', (rid: string[]) => {
        console.log('joining room with rids: ' + rid);
        socket.join(rid);
    });

    socket.on('newConversation', (newConvo: Conversation) =>
        conversationSocket.newConversation(socket, newConvo, socketUserMap)
    );

    socket.on('deleteConversation', (cid: string) => conversationSocket.conversationDelete(socket, cid));

    socket.on('newMessage', (cid: string, message: Message) => conversationSocket.newMessage(socket, cid, message));

    socket.on('messagesRead', (cid: string) => userSocket.onReadReceipt(socket, cid));

    socket.on('newLikeEvent', (cid: string, mid: string, event: Event) =>
        conversationSocket.newLikeEvent(socket, cid, mid, event)
    );

    socket.on('forceDisconnect', () => {
        socket.disconnect(true);
    });

    socket.on('disconnect', () => {
        console.log(`user disconnected`);
        delete socketUserMap[socket.id];
        socket.disconnect();
    });
};

export default socketsRouter;
