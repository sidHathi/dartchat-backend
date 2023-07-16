import { Socket } from 'socket.io';
import { Message, Event } from '../models';
import { messagesService } from '../services';
import { PushNotificationsService } from 'services/pushNotifications-service';

const newMessage = async (socket: Socket, cid: string, message: Message, pnService?: PushNotificationsService) => {
    console.log('new message received');
    // send the message to the appropriate room and store it in the conversation
    try {
        console.log('sending to room: ' + cid);
        console.log(message);
        await messagesService.storeNewMessage(cid, message);
        socket.to(cid).emit('newMessage', cid, message);
        if (pnService) {
            await pnService.pushMessage(cid, message);
        }
        return message;
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

const newLikeEvent = async (
    socket: Socket,
    cid: string,
    mid: string,
    event: Event,
    pnService?: PushNotificationsService
) => {
    try {
        const uid = socket.data.user.uid;
        socket.to(cid).emit('newLikeEvent', cid, mid, uid, event);
        console.log('new like sent');
        const message = await messagesService.storeNewLike(cid, mid, uid, event.type);
        if (pnService) {
            await pnService.pushLike(cid, message, uid, event);
        }
        return true;
    } catch (err) {
        return Promise.reject(err);
    }
};

const messagesSocket = {
    newMessage,
    newLikeEvent
};

export default messagesSocket;
