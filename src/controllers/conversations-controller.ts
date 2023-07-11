import { RequestHandler } from 'express';
import { conversationsService } from '../services';
import { Conversation, Message, UserProfile } from '../models';
import { MessageCursor, encodeCursor, getNextCursor, getCursorForQuery } from '../pagination';
import { getErrorMessage } from '../utils/request-utils';

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

const getConversationMessages: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const cursor: MessageCursor = getCursorForQuery(req);
        console.log(cursor);
        const messages: Message[] = await conversationsService.getConversationMessages(cid, cursor);

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
        const messages: Message[] = await conversationsService.getConversationMessagesToDate(cid, cursor, date);

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
        const message = await conversationsService.getConversationMessage(req.params.cid, req.params.mid);
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
        console.log('NEW PROFILE');
        console.log(newProfile);
        const updateRes = await conversationsService.updateConversationProfile(cid, newProfile);
        if (updateRes) {
            res.status(200).send(updateRes);
        }
    } catch (err) {
        next(err);
    }
};

const conversationsController = {
    getConversation,
    getConversationMessages,
    getConversationMessagesToDate,
    getConversationMessage,
    deleteConversation,
    updateConversationProfile
};

export default conversationsController;
