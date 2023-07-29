import { CalendarEvent, Conversation, Message, Poll, UserConversationProfile, UserData } from '../models';
import messagesService from './messages-service';
import { Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';
import { ScheduledMessagesService } from './scheduledMessages-service';

const genSystemMessage = (content: string, refId?: string): Message => {
    return {
        timestamp: new Date(),
        messageType: 'system',
        encryptionLevel: 'none',
        content,
        senderId: 'system',
        id: refId || uuid(),
        likes: []
    };
};

const sendSystemMessage = async (message: Message, cid: string, socket?: Socket) => {
    try {
        const res = await messagesService.storeNewMessage(cid, message);
        if (socket) {
            socket.to(cid).emit('newMessage', cid, message);
            socket.emit('newMessage', cid, message);
        }
        return res;
    } catch (err) {
        console.log(err);
        return undefined;
    }
};

const getEventReminderMessage = (eid: string, eventName: string, reminderTime: string) => {
    // this should be basic -> just add the reminder message to the chat
    const message: Message = genSystemMessage(`${eventName} is starting ${reminderTime}`, `${eid}-${reminderTime}`);
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
    return 'now';
};

const sendEventResponse = async (
    cid: string,
    event: CalendarEvent,
    response: string,
    user: UserData,
    socket?: Socket
) => {
    // also basic -> just log a user's response to an event
    let content: string | undefined = undefined;
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
    const message = genSystemMessage(content);
    await sendSystemMessage(message, cid, socket);
    return;
};

const scheduleEvent = (cid: string, event: CalendarEvent, scmService: ScheduledMessagesService) => {
    // this should implement the above functions with node Cron
    event.reminders.map((time: Date) => {
        const message = getEventReminderMessage(event.id, event.name, getTimeStringForReminder(time, event.date));
        scmService.addMessage(cid, message, time);
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
    return genSystemMessage(`Poll: ${poll.question} has expired`);
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
    await sendSystemMessage(message, convo.id, socket);
};

const handleUserJoins = async (cid: string, profile: UserConversationProfile, socket?: Socket) => {
    const message = genSystemMessage(`${profile.displayName} joined the group`);
    await sendSystemMessage(message, cid, socket);
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
        await sendSystemMessage(message, convo.id, socket);
    }
};

const handleUserAdded = async (convo: Conversation, uid: string, senderId: string, socket?: Socket) => {
    const userMatch = convo.participants.find((p) => p.id === uid);
    const senderMatch = convo.participants.find((p) => p.id === senderId);
    if (userMatch && senderMatch) {
        const message = genSystemMessage(`${senderMatch.displayName} added ${userMatch.displayName} to the group`);
        await sendSystemMessage(message, convo.id, socket);
    }
};

const handleChatAvatarChanged = async (convo: Conversation, uid: string, socket?: Socket) => {
    const userMatch = convo.participants.find((p) => p.id === uid);
    if (userMatch) {
        const message = genSystemMessage(`${userMatch.displayName} changed the group avatar`);
        await sendSystemMessage(message, convo.id, socket);
    }
};

const handleChatNameChanged = async (convo: Conversation, uid: string, newName: string, socket?: Socket) => {
    const userMatch = convo.participants.find((p) => p.id === uid);
    if (userMatch) {
        const message = genSystemMessage(`${userMatch.displayName} changed the group name to "${newName}"`);
        await sendSystemMessage(message, convo.id, socket);
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
    handleChatNameChanged
};

export default systemMessagingService;
