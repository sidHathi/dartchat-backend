import { Socket } from 'socket.io';
import { UserData, ConversationPreview } from '../models';
import { usersService } from '../services';

const onUserAuth = async (socket: Socket) => {
    try {
        const uid = socket.data.user.uid;
        const user: UserData = await usersService.getUser(uid);
        user.conversations?.map((c: ConversationPreview) => {
            socket.join(c.cid);
        });
        return user;
    } catch (err) {
        return null;
    }
};

const onReadReceipt = async (socket: Socket, cid: string) => {
    try {
        const uid = socket.data.user.uid;
        const res = await usersService.handleReadReceipt(uid, cid);
        if (res) return res;
        return null;
    } catch (err) {
        return null;
    }
};

const userSocket = {
    onUserAuth,
    onReadReceipt
};

export default userSocket;
