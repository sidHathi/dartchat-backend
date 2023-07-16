import express from 'express';
import { conversationsController } from '../controllers';

const conversationsRouter = express();

conversationsRouter.route('/:id').get(conversationsController.getConversation);
conversationsRouter.route('/:id/messages').get(conversationsController.getConversationMessages);
conversationsRouter.route('/:cid/messages/:mid').get(conversationsController.getConversationMessage);
conversationsRouter.route('/:id/messagesToDate').post(conversationsController.getConversationMessagesToDate);
conversationsRouter.route('/delete/:id').delete(conversationsController.deleteConversation);
conversationsRouter.route('/:id/updateProfile').post(conversationsController.updateConversationProfile);
conversationsRouter.route('/:id/updateDetails').put(conversationsController.updateConversationDetails);
conversationsRouter.route('/:id/info').get(conversationsController.getConversationInfo);
conversationsRouter.route('/:id/updateNotStatus').put(conversationsController.updateUserNotStatus);
conversationsRouter.route('/:id/addUsers').put(conversationsController.addUsers);
conversationsRouter.route('/:id/removeUser').put(conversationsController.removeUser);
conversationsRouter.route('/:id/join').put(conversationsController.joinConvo);
conversationsRouter.route('/:id/leave').put(conversationsController.leaveConvo);

export default conversationsRouter;
