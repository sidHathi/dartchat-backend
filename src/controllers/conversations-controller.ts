import { RequestHandler } from 'express';
import { conversationsService } from '../services';
import { Conversation } from '../models';

const getConversation: RequestHandler = async (req, res, next) => {
    try {
        const cid = req.params.id;
        const convo: Conversation = await conversationsService.getConversation(cid);
        res.status(200).send(convo);
    } catch (err) {
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

const conversationsController = {
    getConversation,
    deleteConversation
};

export default conversationsController;
