"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const messages_service_1 = __importDefault(require("./messages-service"));
const uuid_1 = require("uuid");
const request_utils_1 = require("../utils/request-utils");
const genSystemMessage = (content, refId, link, customTime) => {
    return (0, request_utils_1.cleanUndefinedFields)({
        timestamp: customTime || new Date(),
        messageType: 'system',
        encryptionLevel: 'none',
        content,
        senderId: 'system',
        id: refId || (0, uuid_1.v4)(),
        likes: [],
        messageLink: link,
        inGallery: false
    });
};
const sendSystemMessage = (message, convo, socket, pnService) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const res = yield messages_service_1.default.storeNewMessage(convo.id, message);
        if (socket) {
            socket.to(convo.id).emit('newMessage', convo.id, message);
            socket.emit('newMessage', convo.id, message);
        }
        if (pnService) {
            yield pnService.pushSystemMessage(convo, message);
        }
        return res;
    }
    catch (err) {
        console.log(err);
        return undefined;
    }
});
const getEventReminderMessage = (eid, eventName, reminderTimeString, reminderTimeDate, link) => {
    const message = genSystemMessage(`${eventName} is starting ${reminderTimeString}`, `${eid}-${reminderTimeString}`, link, reminderTimeDate);
    return message;
};
const getTimeStringForReminder = (reminderDate, eventDate) => {
    const difMin = (eventDate.getTime() - reminderDate.getTime()) / 60000;
    if (difMin < 5) {
        return 'now';
    }
    else if (difMin < 15) {
        return 'in 10 minutes';
    }
    else if (difMin < 45) {
        return 'in 30 minutes';
    }
    else if (difMin < 90) {
        return 'in 1 hour';
    }
    else if (difMin < 60 * 36) {
        return 'in 1 day';
    }
    return undefined;
};
const sendEventResponse = (convo, event, response, user, socket, pnService) => __awaiter(void 0, void 0, void 0, function* () {
    let content;
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
    yield sendSystemMessage(message, convo, socket, pnService);
    return;
});
const scheduleEvent = (cid, event, scmService) => {
    event.reminders.map((time) => {
        const timeString = getTimeStringForReminder(time, event.date);
        if (timeString) {
            const message = getEventReminderMessage(event.id, event.name, timeString, event.date, event.messageLink);
            scmService.addMessage(cid, message, time);
        }
    });
    return;
};
const removeEvent = (eid, scmService) => {
    if (!scmService.scheduledMessages)
        return;
    scmService.scheduledMessages
        .filter((scmMessage) => {
        return scmMessage.name.includes(eid);
    })
        .map((scmMessage) => {
        scmService.removeMessage(scmMessage.name);
    });
};
const getPollCompletionMessage = (poll) => {
    return genSystemMessage(`Poll: ${poll.question} has expired`, undefined, poll.messageLink);
};
const schedulePoll = (cid, poll, scmService) => {
    const message = getPollCompletionMessage(poll);
    scmService.addMessage(cid, message, poll.expirationDate);
};
const removePoll = (pid, scmService) => {
    if (!scmService.scheduledMessages)
        return;
    scmService.scheduledMessages
        .filter((scmMessage) => {
        return scmMessage.name.includes(pid);
    })
        .map((scmMessage) => {
        scmService.removeMessage(scmMessage.name);
    });
};
const handleUserLeaves = (convo, profile, socket) => __awaiter(void 0, void 0, void 0, function* () {
    const message = genSystemMessage(`${profile.displayName} left the group`);
    yield sendSystemMessage(message, convo, socket);
});
const handleUserJoins = (convo, profile, socket) => __awaiter(void 0, void 0, void 0, function* () {
    const message = genSystemMessage(`${profile.displayName} joined the group`);
    yield sendSystemMessage(message, convo, socket);
});
const handleUserRemoved = (convo, profile, senderId, socket) => __awaiter(void 0, void 0, void 0, function* () {
    const senderMatch = convo.participants.find((p) => p.id === senderId);
    if (senderMatch) {
        const message = genSystemMessage(`${senderMatch.displayName} removed ${profile.displayName} from the group`);
        yield sendSystemMessage(message, convo, socket);
    }
});
const handleUserAdded = (convo, uid, senderId, socket) => __awaiter(void 0, void 0, void 0, function* () {
    const userMatch = convo.participants.find((p) => p.id === uid);
    const senderMatch = convo.participants.find((p) => p.id === senderId);
    if (userMatch && senderMatch) {
        const message = genSystemMessage(`${senderMatch.displayName} added ${userMatch.displayName} to the group`);
        yield sendSystemMessage(message, convo, socket);
    }
});
const handleChatAvatarChanged = (convo, uid, socket) => __awaiter(void 0, void 0, void 0, function* () {
    const userMatch = convo.participants.find((p) => p.id === uid);
    if (userMatch) {
        const message = genSystemMessage(`${userMatch.displayName} changed the group avatar`);
        yield sendSystemMessage(message, convo, socket);
    }
});
const handleChatNameChanged = (convo, uid, newName, socket) => __awaiter(void 0, void 0, void 0, function* () {
    const userMatch = convo.participants.find((p) => p.id === uid);
    if (userMatch) {
        const message = genSystemMessage(`${userMatch.displayName} changed the group name to "${newName}"`);
        yield sendSystemMessage(message, convo, socket);
    }
});
const handleUserRoleChanged = (convo, actorId, uid, newRole, socket) => __awaiter(void 0, void 0, void 0, function* () {
    const actorMatch = convo.participants.find((p) => p.id === actorId);
    const userMatch = convo.participants.find((p) => p.id === uid);
    if (userMatch && actorMatch) {
        if (newRole === 'admin') {
            const message = genSystemMessage(`${actorMatch.displayName} made ${userMatch.displayName} a group admin`);
            yield sendSystemMessage(message, convo, socket);
        }
        else {
            const message = genSystemMessage(`${actorMatch.displayName} removed ${userMatch.displayName}'s admin status`);
            yield sendSystemMessage(message, convo, socket);
        }
    }
});
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
exports.default = systemMessagingService;
