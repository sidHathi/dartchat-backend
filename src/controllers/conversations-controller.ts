import { RequestHandler } from 'express';
import { conversationsService, messagesService, usersService } from '../services';
import { Conversation, Message, UserConversationProfile, UserProfile } from '../models';
import { MessageCursor, encodeCursor, getNextCursor, getCursorForQuery } from '../pagination';
import { getErrorMessage } from '../utils/request-utils';
import { cleanConversation, getProfileForUser } from '../utils/conversation-utils';

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
        console.log(nextCursorString);
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

        res.status(200).send(cleanConversation(convo));
    } catch (err) {
        next(err);
    }
};

const getConversationMessages: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const cursor: MessageCursor = getCursorForQuery(req);
        console.log(cursor);
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
        console.log(cursor);
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
        console.log('deleting conversation - controller');
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
        const newUserProfiles = req.body as UserConversationProfile[];
        const additionRes = await conversationsService.addUsers(cid, newUserProfiles);
        res.status(200).send(additionRes);
    } catch (err) {
        next(err);
    }
};

const removeUser: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id as string;
        const uid = req.body.userId;
        const deletionRes = await conversationsService.removeUser(cid, uid);
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

const leaveConvo: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id as string;
        const uid = res.locals.uid;
        const deletionRes = await conversationsService.removeUser(cid, uid);
        res.status(200).send(deletionRes);
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
    leaveConvo
};

export default conversationsController;
