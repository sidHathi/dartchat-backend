import {
    CalendarEvent,
    ChatRole,
    Conversation,
    Message,
    Poll,
    UserConversationProfile,
    UserData,
    DecryptedMessage
} from '../models';
import messagesService from './messages-service';
import { Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';
import { ScheduledMessagesService } from './scheduledMessages-service';
import { PushNotificationsService } from './pushNotifications-service';
import { cleanUndefinedFields } from '../utils/request-utils';

const genSystemMessage = (content: string, refId?: string, link?: string, customTime?: Date): Message => {
    return cleanUndefinedFields({
        timestamp: customTime || new Date(),
        messageType: 'system',
        encryptionLevel: 'none',
        content,
        senderId: 'system',
        id: refId || uuid(),
        likes: [],
        messageLink: link,
        inGallery: false
    });
};

const sendSystemMessage = async (
    message: Message,
    convo: Conversation,
    socket?: Socket,
    pnService?: PushNotificationsService
) => {
    try {
        const res = await messagesService.storeNewMessage(convo.id, message);
        if (socket) {
            socket.to(convo.id).emit('newMessage', convo.id, message);
            socket.emit('newMessage', convo.id, message);
        }
        if (pnService) {
            await pnService.pushSystemMessage(convo, message as DecryptedMessage);
        }
        return res;
    } catch (err) {
        console.log(err);
        return undefined;
    }
};

const getEventReminderMessage = (
    eid: string,
    eventName: string,
    reminderTimeString: string,
    reminderTimeDate: Date,
    link?: string
) => {
    // this should be basic -> just add the reminder message to the chat
    const message: Message = genSystemMessage(
        `${eventName} is starting ${reminderTimeString}`,
        `${eid}-${reminderTimeString}`,
        link,
        reminderTimeDate
    );
    return message;
};

const getTimeStringForReminder = (reminderDate: Date, eventDate: Date) => {
    const difMin = (eventDate.getTime() - reminderDate.getTime()) / 60000;

    if (difMin < 5) {
        return 'now';
    } else if (difMin < 15) {
        return 'in 10 minutes';
    } else if (difMin < 45) {
        return 'in 30 minutes';
    } else if (difMin < 90) {
        return 'in 1 hour';
    } else if (difMin < 60 * 36) {
        return 'in 1 day';
    }
    return undefined;
};

const sendEventResponse = async (
    convo: Conversation,
    event: CalendarEvent,
    response: string,
    user: UserConversationProfile,
    socket?: Socket,
    pnService?: PushNotificationsService
) => {
    // also basic -> just log a user's response to an event
    let content: string | undefined;
    const userName = user.displayName || user.handle;
    const eventName = event.name;
    switch (response) {
        case 'going':
            content = `${userName} is going to ${eventName}`;
            break;
        case 'notGoing':
            content = `${userName} is not going to ${eventName}`;
            break;
        default:
            content = `${userName} is undecided about ${eventName}`;
            break;
    }
    const message = genSystemMessage(content, undefined, event.messageLink);
    await sendSystemMessage(message, convo, socket, pnService);
    return;
};

const scheduleEvent = (cid: string, event: CalendarEvent, scmService: ScheduledMessagesService) => {
    // this should implement the above functions with node Cron
    event.reminders.map((time: Date) => {
        const timeString = getTimeStringForReminder(time, event.date);
        if (timeString) {
            const message = getEventReminderMessage(event.id, event.name, timeString, event.date, event.messageLink);
            scmService.addMessage(cid, message, time);
        }
    });
    return;
};

const removeEvent = (eid: string, scmService: ScheduledMessagesService) => {
    if (!scmService.scheduledMessages) return;
    scmService.scheduledMessages
        .filter((scmMessage) => {
            return scmMessage.name.includes(eid);
        })
        .map((scmMessage) => {
            scmService.removeMessage(scmMessage.name);
        });
};

const getPollCompletionMessage = (poll: Poll) => {
    return genSystemMessage(`Poll: ${poll.question} has expired`, undefined, poll.messageLink);
};

const schedulePoll = (cid: string, poll: Poll, scmService: ScheduledMessagesService) => {
    const message = getPollCompletionMessage(poll);
    scmService.addMessage(cid, message, poll.expirationDate);
};

const removePoll = (pid: string, scmService: ScheduledMessagesService) => {
    if (!scmService.scheduledMessages) return;
    scmService.scheduledMessages
        .filter((scmMessage) => {
            return scmMessage.name.includes(pid);
        })
        .map((scmMessage) => {
            scmService.removeMessage(scmMessage.name);
        });
};

const handleUserLeaves = async (convo: Conversation, profile: UserConversationProfile, socket?: Socket) => {
    const message = genSystemMessage(`${profile.displayName} left the group`);
    await sendSystemMessage(message, convo, socket);
};

const handleUserJoins = async (convo: Conversation, profile: UserConversationProfile, socket?: Socket) => {
    const message = genSystemMessage(`${profile.displayName} joined the group`);
    await sendSystemMessage(message, convo, socket);
};

const handleUserRemoved = async (
    convo: Conversation,
    profile: UserConversationProfile,
    senderId: string,
    socket?: Socket
) => {
    const senderMatch = convo.participants.find((p) => p.id === senderId);
    if (senderMatch) {
        const message = genSystemMessage(`${senderMatch.displayName} removed ${profile.displayName} from the group`);
        await sendSystemMessage(message, convo, socket);
    }
};

const handleUserAdded = async (convo: Conversation, uid: string, senderId: string, socket?: Socket) => {
    const userMatch = convo.participants.find((p) => p.id === uid);
    const senderMatch = convo.participants.find((p) => p.id === senderId);
    if (userMatch && senderMatch) {
        const message = genSystemMessage(`${senderMatch.displayName} added ${userMatch.displayName} to the group`);
        await sendSystemMessage(message, convo, socket);
    }
};

const handleChatAvatarChanged = async (convo: Conversation, uid: string, socket?: Socket) => {
    const userMatch = convo.participants.find((p) => p.id === uid);
    if (userMatch) {
        const message = genSystemMessage(`${userMatch.displayName} changed the group avatar`);
        await sendSystemMessage(message, convo, socket);
    }
};

const handleChatNameChanged = async (convo: Conversation, uid: string, newName: string, socket?: Socket) => {
    const userMatch = convo.participants.find((p) => p.id === uid);
    if (userMatch) {
        const message = genSystemMessage(`${userMatch.displayName} changed the group name to "${newName}"`);
        await sendSystemMessage(message, convo, socket);
    }
};

const handleUserRoleChanged = async (
    convo: Conversation,
    actorId: string,
    uid: string,
    newRole: ChatRole,
    socket?: Socket
) => {
    const actorMatch = convo.participants.find((p) => p.id === actorId);
    const userMatch = convo.participants.find((p) => p.id === uid);
    if (userMatch && actorMatch) {
        if (newRole === 'admin') {
            const message = genSystemMessage(`${actorMatch.displayName} made ${userMatch.displayName} a group admin`);
            await sendSystemMessage(message, convo, socket);
        } else {
            const message = genSystemMessage(
                `${actorMatch.displayName} removed ${userMatch.displayName}'s admin status`
            );
            await sendSystemMessage(message, convo, socket);
        }
    }
};

const systemMessagingService = {
    sendEventResponse,
    scheduleEvent,
    removeEvent,
    schedulePoll,
    removePoll,
    handleUserLeaves,
    handleUserJoins,
    handleUserRemoved,
    handleUserAdded,
    handleChatAvatarChanged,
    handleChatNameChanged,
    handleUserRoleChanged
};

export default systemMessagingService;
