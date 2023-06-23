import admin from 'services/firebase-service';
import { Request, Response, NextFunction } from 'express';

export interface IGetAuthTokenRequest extends Request {
    authToken?: string;
    authId?: string;
}

export const getAuthToken = (req: IGetAuthTokenRequest, res: Response, next: NextFunction) => {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        req.authToken = req.headers.authorization.split(' ')[1];
    } else {
        req.authToken = undefined;
    }
    next();
};

export const checkIfAuthenticated = (req: IGetAuthTokenRequest, res: Response, next: NextFunction) => {
    getAuthToken(req, res, async () => {
        try {
            const { authToken } = req;
            const userInfo = await admin.auth().verifyIdToken(authToken || 'bad token');
            req.authId = userInfo.uid;
            return next();
        } catch (e) {
            return res.status(401).send({ error: 'You are not authorized to make this request' });
        }
    });
};
