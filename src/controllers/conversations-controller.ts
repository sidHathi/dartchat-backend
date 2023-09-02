import { RequestHandler } from 'express';
import { conversationsService, messagesService, secretsService, usersService } from '../services';
import {
    CalendarEvent,
    Conversation,
    Message,
    Poll,
    RawCalendarEvent,
    UserConversationProfile,
    UserProfile
} from '../models';
import { MessageCursor, encodeCursor, getNextCursor, getCursorForQuery } from '../pagination';
import { getErrorMessage, parseEvent, parsePoll } from '../utils/request-utils';
import { cleanConversation, getProfileForUser } from '../utils/conversation-utils';

const messageTransferLimit = 10000;

const getConversation: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const cursor: MessageCursor = getCursorForQuery(req);
        const convo: Conversation | null = await conversationsService.getConversation(cid, cursor);
        if (!convo) {
            res.status(404).send();
            return;
        }

        const lastMessage = convo.messages.length > 0 ? convo.messages[convo.messages.length - 1] : null;
        const nextCursorString =
            lastMessage && convo.messages.length >= cursor.size
                ? encodeCursor(getNextCursor(cursor, lastMessage.timestamp))
                : 'none';
        res.set('cursor', nextCursorString);
        res.status(200).send(convo);
    } catch (err) {
        next(err);
    }
};

const getConversationInfo: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const convo = await conversationsService.getConversationInfo(cid);
        if (!convo) {
            res.status(404).send();
            return;
        }

        res.status(200).send(convo);
    } catch (err) {
        next(err);
    }
};

const getConversationMessages: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const cursor: MessageCursor = getCursorForQuery(req);
        const messages: Message[] = await messagesService.getConversationMessages(cid, cursor);

        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const nextCursor =
            lastMessage && messages.length >= cursor.size
                ? encodeCursor(getNextCursor(cursor, lastMessage.timestamp))
                : 'none';
        res.set('cursor', nextCursor);
        res.status(200).send(messages);
    } catch (err) {
        next(err);
    }
};

const getConversationMessagesToDate: RequestHandler = async (req, res, next) => {
    try {
        if (!req.params.id || !req.body.date) {
            res.status(400).send();
            return;
        }
        const cid = req.params.id;
        const date: Date = new Date(Date.parse(req.body.date));
        const cursor: MessageCursor = getCursorForQuery(req);
        const messages: Message[] = await messagesService.getConversationMessagesToDate(cid, cursor, date);

        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const nextCursor =
            lastMessage && messages.length >= cursor.size
                ? encodeCursor(getNextCursor(cursor, lastMessage.timestamp))
                : 'none';
        res.set('cursor', nextCursor);
        res.status(200).send(messages);
    } catch (err) {
        next(err);
    }
};

const getConversationMessage: RequestHandler = async (req, res, next) => {
    try {
        if (!req.params.cid || !req.params.mid) {
            res.status(404).send();
            return;
        }
        const message = await messagesService.getConversationMessage(req.params.cid, req.params.mid);
        res.status(200).send(message);
    } catch (err) {
        const message = getErrorMessage(err);
        if (message === 'no such message') {
            res.status(404).send(message);
        }
        next(err);
    }
};

const deleteConversation: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const uid = res.locals?.uid;
        const delRes = await conversationsService.deleteConversation(cid, uid);
        res.status(200).send(delRes);
    } catch (err) {
        next(err);
    }
};

const updateConversationProfile: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const newProfile = req.body as UserProfile;
        const updateRes = await conversationsService.updateConversationProfile(cid, newProfile);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400);
    } catch (err) {
        next(err);
    }
};

const updateConversationDetails: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const updates = req.body;
        const updateRes = await conversationsService.updateConversationDetails(cid, updates);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send();
    } catch (err) {
        next(err);
    }
};

const updateUserNotStatus: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const uid = res.locals.uid;
        const newStatus = req.body.status;
        const updateRes = await conversationsService.updateUserNotStatus(cid, uid, newStatus);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send();
    } catch (err) {
        next(err);
    }
};

const addUsers: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id as string;
        // legacy:
        if (!req.body.profiles) {
            const newUserProfiles = req.body as UserConversationProfile[];
            const additionRes = await conversationsService.addUsers(cid, newUserProfiles);
            res.status(200).send(additionRes);
        } else {
            const profiles = req.body.profiles as UserConversationProfile[];
            const userKeyMap = req.body.userKeyMap as { [id: string]: string } | undefined;
            const additionRes = await conversationsService.addUsers(cid, profiles, userKeyMap);
            res.status(200).send(additionRes);
        }
    } catch (err) {
        next(err);
    }
};

const removeUser: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id as string;
        const actorId = res.locals.uid;
        const uid = req.body.userId;
        const deletionRes = await conversationsService.removeUser(cid, actorId, uid, false);
        res.status(200).send(deletionRes);
    } catch (err) {
        next(err);
    }
};

const joinConvo: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id as string;
        const uid = res.locals.uid;
        const user = await usersService.getUser(uid);
        const profiles = [getProfileForUser(user)];
        const additionRes = await conversationsService.addUsers(cid, profiles);
        res.status(200).send(additionRes);
    } catch (err) {
        next(err);
    }
};

const getConversationsInfo: RequestHandler = async (req, res, next) => {
    try {
        const cids = req.body as string[];
        if (!cids) {
            res.status(404).send();
            return;
        }
        const conversations = await conversationsService.getConversationsInfo(cids);
        res.status(200).send(conversations);
    } catch (err) {
        next(err);
    }
};

const leaveConvo: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id as string;
        const uid = res.locals.uid;
        const deletionRes = await conversationsService.removeUser(cid, uid, uid, true);
        res.status(200).send(deletionRes);
    } catch (err) {
        next(err);
    }
};

const addPoll: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const poll = parsePoll(req.body) as Poll;
        const updateRes = await conversationsService.addPoll(cid, poll);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send('server update failed');
    } catch (err) {
        next(err);
    }
};

const recordPollResponse: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const uid = res.locals.uid;
        const { pid, selectedOptionIndices } = req.body;
        const updateRes = await conversationsService.recordPollResponse(cid, uid, pid, selectedOptionIndices);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send('server update failed');
    } catch (err) {
        next(err);
    }
};

const getPoll: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.cid;
        const pid = req.params.pid;
        const poll = await conversationsService.getPoll(cid, pid);
        if (poll) {
            res.status(200).send(poll);
            return;
        }
        res.status(404).send('no matching poll found');
    } catch (err) {
        next(err);
    }
};

const addEvent: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const event = parseEvent(req.body as RawCalendarEvent);
        const updateRes = await conversationsService.addEvent(cid, event);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send('server update failed');
    } catch (err) {
        next(err);
    }
};

const recordEventRsvp: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const uid = res.locals.uid;
        const { eid, response } = req.body;
        const updateRes = await conversationsService.recordEventRsvp(cid, eid, uid, response);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send('server update failed');
    } catch (err) {
        next(err);
    }
};

const getEvent: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.cid;
        const eid = req.params.eid;
        const event = await conversationsService.getEvent(cid, eid);
        if (event) {
            res.status(200).send(event);
            return;
        }
        res.status(404).send('no matching poll found');
    } catch (err) {
        next(err);
    }
};

const changeLikeIcon: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.cid;
        const newIcon = req.body;
        const updateRes = await conversationsService.changeLikeIcon(cid, newIcon);
        res.status(200).send(updateRes);
    } catch (err) {
        next(err);
    }
};

const resetLikeIcon: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.cid;
        const updateRes = await conversationsService.resetLikeIcon(cid);
        res.status(200).send(updateRes);
    } catch (err) {
        next(err);
    }
};

const getGalleryMessages: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const cursor: MessageCursor = getCursorForQuery(req);
        const messages: Message[] = await messagesService.getGalleryMessages(cid, cursor);

        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const nextCursor =
            lastMessage && messages.length >= cursor.size
                ? encodeCursor(getNextCursor(cursor, lastMessage.timestamp))
                : 'none';
        res.set('cursor', nextCursor);
        res.status(200).send(messages);
    } catch (err) {
        next(err);
    }
};

const getReencryptionData: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const dateLimit = req.body.dateLimit ? new Date(Date.parse(req.body.dateLimit)) : undefined;
        const largeMessageList = await messagesService.getLargeMessageList(cid, messageTransferLimit, dateLimit);
        const encryptionData = await secretsService.getReencryptionFieldsForMessageList(largeMessageList);
        res.status(200).send(encryptionData);
    } catch (err) {
        console.log(err);
        return next(err);
    }
};

const pushReencryptedMessages: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const reencryptionData = req.body;
        const convo = await conversationsService.getConversationInfo(cid);
        await messagesService.reencryptMessages(convo, reencryptionData);
        res.status(200).send();
    } catch (err) {
        next(err);
    }
};

const changeEncryptionKey: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const uid = res.locals.uid;
        const { publicKey, userKeyMap, keyInfo } = req.body;
        const convo = await conversationsService.getConversationInfo(cid);
        if (await secretsService.changeEncryptionKey(convo, publicKey, uid, userKeyMap, keyInfo)) {
            res.status(200).send();
        }
        res.status(400).send('Key update failed');
    } catch (err) {
        next(err);
    }
};

const deleteMessage: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.cid;
        const mid = req.params.mid;
        const actorId = res.locals.uid as string;
        const deletionRes = await messagesService.deleteMessage(cid, actorId, mid);
        res.status(200).send(deletionRes);
    } catch (err) {
        next(err);
    }
};

const updateUserRole: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.cid;
        const actorId = res.locals.uid;
        const uid = req.body.uid;
        const newRole = req.body.newRole;
        const convoUpdate = await conversationsService.changeConversationUserRole(cid, actorId, uid, newRole);
        await usersService.updatePreviewRole(uid, cid, newRole);
        res.status(200).send(convoUpdate);
    } catch (err) {
        next(err);
    }
};

const conversationsController = {
    getConversation,
    getConversationInfo,
    getConversationMessages,
    getConversationMessagesToDate,
    getConversationMessage,
    deleteConversation,
    updateConversationProfile,
    updateConversationDetails,
    updateUserNotStatus,
    addUsers,
    removeUser,
    joinConvo,
    leaveConvo,
    recordPollResponse,
    addPoll,
    getPoll,
    addEvent,
    recordEventRsvp,
    getEvent,
    changeLikeIcon,
    resetLikeIcon,
    getGalleryMessages,
    getConversationsInfo,
    getReencryptionData,
    pushReencryptedMessages,
    changeEncryptionKey,
    deleteMessage,
    updateUserRole
};

export default conversationsController;
