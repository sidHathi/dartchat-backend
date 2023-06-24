import { RequestHandler } from 'express';
import { usersService } from '../services';
import { UserData } from 'models';

const getCurrentUser: RequestHandler = async (req, res, next) => {
    try {
        res.status(200).send('Get current user message received');
    } catch (err) {
        next(err);
    }
};

const createNewUser: RequestHandler = async (req, res, next) => {
    try {
        // use with auth
        // const userId = res.locals?.uid;
        // TEMPORARY:
        const userId = 'test';
        const body = req.body as UserData;
        const userRes = await usersService.createNewUser(userId, body);
        res.status(200).send(userRes);
    } catch (err) {
        next(err);
    }
};

const modifyCurrentUser: RequestHandler = async (req, res, next) => {
    try {
        // use with auth
        // const userId = res.locals?.uid;
        // TEMPORARY:
        const userId = 'test';
        const body = req.body as UserData;
        const userRes = await usersService.updateUser(userId, body);
        res.status(200).send(userRes);
    } catch (err) {
        next(err);
    }
};

const usersController = {
    getCurrentUser,
    createNewUser,
    modifyCurrentUser
};

export default usersController;
