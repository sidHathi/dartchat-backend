import { RequestHandler } from 'express';
import { usersService } from '../services';
import { UserData } from '../models';
import { getErrorMessage } from '../utils';

const getCurrentUser: RequestHandler = async (req, res, next) => {
    try {
        const userId = res.locals?.uid;
        const userRes = await usersService.getCurrentUser(userId);
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

const usersController = {
    getCurrentUser,
    createNewUser,
    modifyCurrentUser
};

export default usersController;
