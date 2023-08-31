import { Socket } from 'socket.io';
import { Conversation, UserConversationProfile, Message, Poll, CalendarEvent, ChatRole } from '../models';
import {
    conversationsService,
    messagesService,
    PushNotificationsService,
    ScheduledMessagesService,
    secretsService,
    systemMessagingService,
    usersService
} from '../services';

const newConversation = async (
    socket: Socket,
    newConvo: Conversation,
    userSocketMap: { [userId: string]: string },
    recipientKeyMap?: { [key: string]: string },
    pnService?: PushNotificationsService
): Promise<Conversation | null> => {
    socket.join(newConvo.id);
    try {
        const user = socket.data.user;
        if (await conversationsService.conversationExists(newConvo.id)) {
            return newConvo;
        }
        const seedMessage = await messagesService.generateConversationInitMessage(newConvo, user.uid);
        await conversationsService.createNewConversation(newConvo, user.uid, recipientKeyMap);
        await messagesService.storeNewMessage(newConvo.id, seedMessage);
        const recipients = newConvo.participants;
        recipients.map((r) => {
            socket.to(r.id).emit('newConversation', newConvo, recipientKeyMap);
        });
        socket.to(newConvo.id).emit('newMessage', newConvo.id, seedMessage);
        socket.emit('newMessage', newConvo.id, seedMessage);
        socket.emit('conversationReceived', newConvo);
        socket.join(newConvo.id);
        if (pnService) {
            await pnService.pushNewConvo(newConvo, user.uid, recipientKeyMap);
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
    recipientKeyMap?: { [userId: string]: string },
    pnService?: PushNotificationsService
) => {
    try {
        const newConvo = await newConversation(socket, seedConvo, userSocketMap, recipientKeyMap, pnService);
        if (newConvo) {
            socket.emit('newConversation', newConvo);
            const deliveredMessage = {
                ...firstMessage,
                delivered: true,
                timestamp: new Date()
            };
            await messagesService.storeNewMessage(newConvo.id, deliveredMessage);
            socket.to(newConvo.id).emit('newMessage', newConvo.id, deliveredMessage);
            socket.emit('newMessage', newConvo.id, deliveredMessage);
            if (pnService && newConvo) {
                if (newConvo.publicKey && recipientKeyMap) {
                    const senderId = socket.data.user.uid;
                    await pnService.pushNewSecrets(newConvo, senderId, newConvo.publicKey, recipientKeyMap);
                    await new Promise((res) => setTimeout(res, 100));
                }
                await pnService.pushMessage(newConvo.id, deliveredMessage);
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
    userSocketMap: { [userId: string]: string },
    userKeyMap?: { [id: string]: string },
    pnService?: PushNotificationsService
) => {
    // handle logic through http requests so permissions can be taken into account and error messages sent back if necessary
    socket.to(cid).emit('newConversationUsers', cid, profiles);
    const senderId = socket.data.user.uid;
    const convo = await conversationsService.getConversationInfo(cid);
    await Promise.all(
        profiles.map(async (p) => {
            socket.to(p.id).emit('newConversationUsers', cid, [], userKeyMap);
            if (p.id !== senderId) {
                await systemMessagingService.handleUserAdded(convo, p.id, senderId, socket);
                if (userKeyMap) {
                    secretsService.addUserSecretsForNewParticipants(convo, profiles, userKeyMap);
                }
            } else {
                await systemMessagingService.handleUserJoins(convo, p, socket);
            }
        })
    );
    if (pnService) {
        const senderProfile = convo.participants.find((p) => p.id === senderId);
        if (senderProfile) {
            if (userKeyMap && convo.publicKey) {
                await pnService.pushNewSecrets(convo, senderProfile.id, convo.publicKey, userKeyMap);
            }
            await pnService.pushNewConvoParticipants(convo, senderProfile, profiles, userKeyMap);
        }
    }
};

const removeParticipant = async (socket: Socket, cid: string, profile: UserConversationProfile) => {
    // see above comment
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
            const userProfile = convo.participants.find((p) => p.id === uid);
            if (userProfile) {
                await systemMessagingService.sendEventResponse(convo, event, response, userProfile, socket);
            }
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

const handleKeyChange = async (
    socket: Socket,
    cid: string,
    newPublicKey: string,
    userKeyMap: { [id: string]: string },
    pnService?: PushNotificationsService
) => {
    const senderId = socket.data.user.uid;
    try {
        const convo = await conversationsService.getConversationInfo(cid);
        await secretsService.changeEncryptionKey(convo, newPublicKey, senderId, userKeyMap);
        Object.keys(userKeyMap).map((id) => {
            socket.to(id).emit('keyChange', cid, newPublicKey, userKeyMap);
        });
        if (pnService && socket.data.user.uid) {
            await pnService.pushNewSecrets(convo, senderId, newPublicKey, userKeyMap);
        }
    } catch (err) {
        console.log(err);
    }
};

const deleteMessage = async (
    socket: Socket,
    cid: string,
    mid: string,
    pnService?: PushNotificationsService
): Promise<void> => {
    try {
        const actorId = socket.data.user.uid;
        await messagesService.deleteMessage(cid, actorId, mid);
        socket.to(cid).emit('deleteMessage', cid, mid);
        if (pnService) {
            const senderId = socket.data.user.uid;
            const convo = await conversationsService.getConversationInfo(cid);
            await pnService.pushMessageDelete(convo, senderId, mid);
        }
        return;
    } catch (err) {
        console.log(err);
        return;
    }
};

const handleUserRoleChanged = async (
    socket: Socket,
    cid: string,
    uid: string,
    newRole: ChatRole,
    pnService?: PushNotificationsService
): Promise<void> => {
    try {
        const convo = await conversationsService.getConversationInfo(cid);
        const actorId = socket.data.user.uid;
        await systemMessagingService.handleUserRoleChanged(convo, actorId, uid, newRole, socket);
        socket.to(cid).emit('userRoleChanged', cid, uid, newRole);
        pnService && pnService.pushRoleChange(cid, uid, newRole);
    } catch (err) {
        console.log(err);
    }
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
    removeEvent,
    handleKeyChange,
    deleteMessage,
    handleUserRoleChanged
};

export default conversationsSocket;
