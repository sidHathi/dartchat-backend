import { Socket } from 'socket.io';
import { Conversation, Message } from '../models';
import { conversationsService } from '../services';

const newConversation = async (
    socket: Socket,
    newConvo: Conversation,
    socketUserMap: { [socketId: string]: string }
): Promise<Conversation | never> => {
    console.log('new conversation message received');
    console.log(socketUserMap);
    socket.join(newConvo.id);
    try {
        const user = socket.data.user;
        const seedMessage = await conversationsService.generateConversationInitMessage(newConvo, user.uid);
        await conversationsService.createNewConversation(newConvo);
        await conversationsService.storeNewMessage(newConvo.id, seedMessage);
        const onlineUsers: string[] = Object.entries(socketUserMap)
            .filter(([, uid]) => {
                return uid !== user.uid;
            })
            .map(([sid]) => sid);
        onlineUsers.forEach((usid) => {
            socket.broadcast.to(usid).emit('newConversation', newConvo);
        });
        socket.to(newConvo.id).emit('newMessage', newConvo.id, seedMessage);
        socket.emit('newMessage', newConvo.id, seedMessage);
        socket.emit('conversationReceived', newConvo);
        return newConvo;
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

const newMessage = async (socket: Socket, cid: string, message: Message) => {
    console.log('new message received');
    // send the message to the appropriate room and store it in the conversation
    try {
        console.log('sending to room: ' + cid);
        console.log(message);
        await conversationsService.storeNewMessage(cid, message);
        socket.to(cid).emit('newMessage', cid, message);
        return message;
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

const conversationDelete = async (socket: Socket, cid: string) => {
    try {
        const user = socket.data.user;
        const deletionRes = await conversationsService.deleteConversation(cid, user.uid);
        socket.to(cid).emit('deleteConversation', cid);
        return deletionRes;
    } catch (err) {
        return Promise.reject(err);
    }
};

const newLikeEvent = async (socket: Socket, cid: string, mid: string, event: Event) => {
    try {
        const uid = socket.data.user.uid;
        socket.to(cid).emit('newLikeEvent', cid, mid, uid, event);
        console.log('new like sent');
        // await conversationsService.handleNewLikeEvent(cid, mid, uid, event);
        return true;
    } catch (err) {
        return Promise.reject(err);
    }
};

const conversationSocket = {
    newConversation,
    newMessage,
    conversationDelete,
    newLikeEvent
};

export default conversationSocket;
