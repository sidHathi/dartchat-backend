import { Socket } from 'socket.io';
import { Conversation, UserConversationProfile, Message, Poll, CalendarEvent } from '../models';
import {
    conversationsService,
    messagesService,
    PushNotificationsService,
    ScheduledMessagesService,
    systemMessagingService,
    usersService
} from '../services';

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
        const onlineUsers: string[] = newConvo.participants
            .map((p) => p.id)
            .filter((uid) => {
                socket.to(uid).emit('newConversation', newConvo);
                return uid !== user.uid && uid in userSocketMap;
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
    socket.to(cid).emit('updateConversationDetails', cid);
};

const handleNewName = async (socket: Socket, cid: string, newName: string) => {
    try {
        const senderId = socket.data.user.uid;
        const convo = await conversationsService.getConversationInfo(cid);
        await systemMessagingService.handleChatNameChanged(convo, senderId, newName, socket);
    } catch (err) {
        console.log(err);
    }
};

const handleNewAvatar = async (socket: Socket, cid: string) => {
    try {
        const senderId = socket.data.user.uid;
        const convo = await conversationsService.getConversationInfo(cid);
        await systemMessagingService.handleChatAvatarChanged(convo, senderId, socket);
    } catch (err) {
        console.log(err);
    }
};

const newParticipants = async (
    socket: Socket,
    cid: string,
    profiles: UserConversationProfile[],
    userSocketMap: { [userId: string]: string }
) => {
    // handle logic through http requests so permissions can be taken into account and error messages sent back if necessary
    socket.to(cid).emit('newConversationUsers', cid, profiles);
    const senderId = socket.data.user.uid;
    const convo = await conversationsService.getConversationInfo(cid);
    await Promise.all(
        profiles.map(async (p) => {
            if (p.id in userSocketMap) {
                socket.broadcast.to(userSocketMap[p.id]).emit('newConversationUsers', cid, []);
            }
            if (p.id !== senderId) {
                await systemMessagingService.handleUserAdded(convo, p.id, senderId, socket);
            } else {
                await systemMessagingService.handleUserJoins(convo.id, p, socket);
            }
        })
    );
};

const removeParticipant = async (socket: Socket, cid: string, profile: UserConversationProfile) => {
    // see above comment
    console.log('user will be removed');
    socket.to(cid).emit('removeConversationUser', cid, profile.id);
    const senderId = socket.data.user.uid;
    try {
        const convo = await conversationsService.getConversationInfo(cid);
        if (senderId === profile.id) {
            await systemMessagingService.handleUserLeaves(convo, profile, socket);
        } else {
            await systemMessagingService.handleUserRemoved(convo, profile, senderId, socket);
        }
    } catch (err) {
        console.log(err);
    }
};

const handlePollResponse = async (socket: Socket, cid: string, pid: string, selectedOptionIndices: number[]) => {
    try {
        const uid = socket.data.user.uid;
        console.log(uid);
        const updateRes = await conversationsService.recordPollResponse(cid, uid, pid, selectedOptionIndices);
        if (updateRes) {
            socket.to(cid).emit('pollResponse', cid, uid, pid, selectedOptionIndices);
        }
    } catch (err) {
        console.log(err);
    }
};

const handleEventRsvp = async (socket: Socket, cid: string, eid: string, response: string) => {
    try {
        const uid = socket.data.user.uid;
        const user = await usersService.getUser(uid);
        const convo = await conversationsService.getConversationInfo(cid);
        const event = convo.events?.find((e) => e.id === eid);
        if (!event || !user) return;

        const updateRes = await conversationsService.recordEventRsvp(cid, eid, uid, response);
        if (updateRes) {
            console.log(response);
            await systemMessagingService.sendEventResponse(cid, event, response, user, socket);
        }
        if (updateRes) {
            socket.to(cid).emit('eventRsvp', cid, eid, uid, response);
        }
    } catch (err) {
        console.log(err);
    }
};

const initPoll = (cid: string, poll: Poll, scmService: ScheduledMessagesService) => {
    systemMessagingService.schedulePoll(cid, poll, scmService);
};

const removePoll = (pid: string, scmService: ScheduledMessagesService) => {
    systemMessagingService.removePoll(pid, scmService);
};

const initEvent = (cid: string, event: CalendarEvent, scmService: ScheduledMessagesService) => {
    systemMessagingService.scheduleEvent(cid, event, scmService);
};

const removeEvent = (eid: string, scmService: ScheduledMessagesService) => {
    systemMessagingService.removeEvent(eid, scmService);
};

const conversationsSocket = {
    newConversation,
    newPrivateMessage,
    conversationDelete,
    newUpdateEvent,
    handleNewName,
    handleNewAvatar,
    newParticipants,
    removeParticipant,
    handlePollResponse,
    handleEventRsvp,
    initPoll,
    removePoll,
    initEvent,
    removeEvent
};

export default conversationsSocket;
