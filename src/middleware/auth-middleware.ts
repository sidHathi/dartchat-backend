import admin from '../firebase';
import { RequestHandler } from 'express';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';

export const isAuthenticated: RequestHandler = async (req, res, next) => {
    const { authorization } = req.headers;

    if (!authorization) return res.status(401).send({ message: 'Unauthorized' });

    if (!authorization.startsWith('Bearer')) return res.status(401).send({ message: 'Unauthorized' });

    const split = authorization.split('Bearer ');
    if (split.length !== 2) return res.status(401).send({ message: 'Unauthorized' });

    const token = split[1];

    try {
        const decodedToken: DecodedIdToken = await admin.auth().verifyIdToken(token);
        console.log('decodedToken', JSON.stringify(decodedToken));
        res.locals = { ...res.locals, uid: decodedToken.uid, role: decodedToken.role, email: decodedToken.email };
        return next();
    } catch (err) {
        return res.status(401).send({ message: 'Unauthorized' });
    }
};

export default isAuthenticated;
