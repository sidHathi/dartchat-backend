import { Socket } from 'socket.io';
import { Conversation, UserConversationProfile, Message } from '../models';
import { conversationsService, messagesService, PushNotificationsService } from '../services';

const newConversation = async (
    socket: Socket,
    newConvo: Conversation,
    userSocketMap: { [userId: string]: string },
    pnService?: PushNotificationsService
): Promise<Conversation | null> => {
    console.log('new conversation message received');
    socket.join(newConvo.id);
    try {
        const user = socket.data.user;
        if (await conversationsService.conversationExists(newConvo.id)) {
            return newConvo;
        }
        const seedMessage = await messagesService.generateConversationInitMessage(newConvo, user.uid);
        await conversationsService.createNewConversation(newConvo);
        await messagesService.storeNewMessage(newConvo.id, seedMessage);
        const onlineUsers: string[] = Object.keys(userSocketMap)
            .filter((uid) => {
                return uid !== user.uid && uid in newConvo.participants.map((p) => p.id);
            })
            .map((uid) => userSocketMap[uid]);
        onlineUsers.forEach((usid) => {
            console.log(usid);
            socket.broadcast.to(usid).emit('newConversation', newConvo);
        });
        socket.to(newConvo.id).emit('newMessage', newConvo.id, seedMessage);
        socket.emit('newMessage', newConvo.id, seedMessage);
        socket.emit('conversationReceived', newConvo);
        if (pnService) {
            await pnService.pushNewConvo(newConvo, user.uid);
        }
        return newConvo;
    } catch (err) {
        console.log(err);
        return null;
    }
};

const newPrivateMessage = async (
    socket: Socket,
    seedConvo: Conversation,
    userSocketMap: { [userId: string]: string },
    firstMessage: Message,
    pnService?: PushNotificationsService
) => {
    try {
        const newConvo = await newConversation(socket, seedConvo, userSocketMap, pnService);
        if (newConvo) {
            socket.emit('newConversation', newConvo);
            await messagesService.storeNewMessage(newConvo.id, {
                ...firstMessage,
                timestamp: new Date()
            });
            socket.to(newConvo.id).emit('newMessage', newConvo.id, firstMessage);
            socket.emit('newMessage', newConvo.id, firstMessage);
            if (pnService) {
                await pnService.pushMessage(newConvo.id, firstMessage);
            }
        }
        return newConvo;
    } catch (err) {
        console.log(err);
        return null;
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

const newUpdateEvent = async (socket: Socket, cid: string) => {
    socket.to(cid).emit('updateConversationDetails');
};

const newParticipants = async (
    socket: Socket,
    cid: string,
    profiles: UserConversationProfile[],
    userSocketMap: { [userId: string]: string }
) => {
    // handle logic through http requests so permissions can be taken into account and error messages sent back if necessary
    socket.to(cid).emit('newConversationUsers', cid, profiles);
    profiles.map((p) => {
        if (p.id in userSocketMap) {
            socket.broadcast.to(userSocketMap[p.id]).emit('newConversationUsers', cid, []);
        }
    });
};

const removeParticipant = async (socket: Socket, cid: string, uid: string) => {
    // see above comment
    socket.to(cid).emit('removeConversationUser', cid, uid);
};

const handlePollResponse = async (
    socket: Socket,
    cid: string,
    uid: string,
    pid: string,
    selectedOptionIndices: number[]
) => {
    try {
        const updateRes = await conversationsService.recordPollResponse(cid, uid, pid, selectedOptionIndices);
        if (updateRes) {
            socket.to(cid).emit('pollResponse', cid, uid, pid, selectedOptionIndices);
        }
    } catch (err) {
        console.log(err);
    }
};

const conversationsSocket = {
    newConversation,
    newPrivateMessage,
    conversationDelete,
    newUpdateEvent,
    newParticipants,
    removeParticipant,
    handlePollResponse
};

export default conversationsSocket;
