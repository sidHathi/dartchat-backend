import admin from '../firebase';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import { Socket } from 'socket.io';

const socketAuth = async (socket: Socket, next: (err?: Error) => void) => {
    const { token } = socket.handshake.auth;
    if (!token) next(new Error('unauthorized'));

    try {
        const decodedToken: DecodedIdToken = await admin.auth().verifyIdToken(token);
        socket.data.user = decodedToken;
        next();
    } catch (err) {
        console.log('socket auth failed');
        socket.emit('authFailure');
        socket.disconnect(true);
        next(new Error('unauthorized'));
    }
};

export default socketAuth;
