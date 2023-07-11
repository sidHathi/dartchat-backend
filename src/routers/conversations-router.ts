import express from 'express';
import { conversationsController } from '../controllers';

const conversationsRouter = express();

conversationsRouter.route('/:id').get(conversationsController.getConversation);
conversationsRouter.route('/:id/messages').get(conversationsController.getConversationMessages);
conversationsRouter.route('/:cid/messages/:mid').get(conversationsController.getConversationMessage);
conversationsRouter.route('/:id/messagesToDate').post(conversationsController.getConversationMessagesToDate);
conversationsRouter.route('/delete/:id').delete(conversationsController.deleteConversation);
conversationsRouter.route('/:id/updateProfile').post(conversationsController.updateConversationProfile);

export default conversationsRouter;
