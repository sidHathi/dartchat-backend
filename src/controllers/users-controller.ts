import { RequestHandler } from 'express';
import { usersService } from '../services';
import { UserData } from '../models';
import { getErrorMessage } from '../utils/request-utils';

const getCurrentUser: RequestHandler = async (req, res, next) => {
    try {
        const userId = res.locals?.uid;
        const userRes = await usersService.getUser(userId);
        res.status(200).send(userRes);
    } catch (err) {
        if (getErrorMessage(err) === 'User does not exist') {
            res.status(404).send('User does not exist');
        }
        next(err);
    }
};

const createNewUser: RequestHandler = async (req, res, next) => {
    try {
        // use with auth
        const userId = res.locals?.uid;
        // TEMPORARY:
        // const userId = 'test';
        const body = req.body as UserData;
        const userRes = await usersService.createNewUser(userId, body);
        res.status(201).send(userRes);
    } catch (err) {
        if (getErrorMessage(err) === 'Handle taken') {
            res.status(409).send('Handle taken');
        } else if (getErrorMessage(err) === 'Phone number in use') {
            res.status(409).send('Phone number in use');
        }
        next(err);
    }
};

const modifyCurrentUser: RequestHandler = async (req, res, next) => {
    try {
        // use with auth
        const userId = res.locals?.uid;
        // TEMPORARY:
        // const userId = 'test';
        const body = req.body as UserData;
        const userRes = await usersService.updateUser(userId, body);
        res.status(200).send(userRes);
    } catch (err) {
        if (getErrorMessage(err) === 'Handle taken') {
            res.status(409).send('Handle taken');
        } else if (getErrorMessage(err) === 'Phone number in use') {
            res.status(409).send('Phone number in use');
        }
        next(err);
    }
};

const updatePushTokens: RequestHandler = async (req, res, next) => {
    try {
        const userId = res.locals.uid;
        const newToken = req.body.token as string;
        if (await usersService.updatePushNotificationTokens(newToken, userId)) {
            res.status(200).send();
            return;
        }
        res.status(400).send();
    } catch (err) {
        next(err);
    }
};

const archiveRemove: RequestHandler = async (req, res, next) => {
    try {
        const uid = res.locals.uid;
        const cid = req.params.id;
        const updateRes = await usersService.removeConvoFromArchive(cid, uid);
        if (updateRes) {
            res.status(200).send(updateRes);
            return;
        }
        res.status(400).send('No such conversation in archive');
    } catch (err) {
        next(err);
    }
};

const usersController = {
    getCurrentUser,
    createNewUser,
    modifyCurrentUser,
    updatePushTokens,
    archiveRemove
};

export default usersController;
