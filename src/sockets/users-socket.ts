import { Socket } from 'socket.io';
import { UserData, ConversationPreview } from '../models';
import { usersService } from '../services';

const onUserAuth = async (socket: Socket) => {
    try {
        const uid = socket.data.user.uid;
        const user: UserData = await usersService.getCurrentUser(uid);
        user.conversations?.map((c: ConversationPreview) => {
            socket.join(c.cid);
        });
        return user;
    } catch (err) {
        return Promise.reject(err);
    }
};

const onReadReceipt = async (socket: Socket, cid: string) => {
    try {
        const uid = socket.data.user.uid;
        return await usersService.handleReadReceipt(uid, cid);
    } catch (err) {
        return Promise.reject(err);
    }
};

const userSocket = {
    onUserAuth,
    onReadReceipt
};

export default userSocket;
