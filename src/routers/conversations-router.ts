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
conversationsRouter.route('/:id/addPoll').post(conversationsController.addPoll);
conversationsRouter.route('/:cid/polls/:pid').get(conversationsController.getPoll);
conversationsRouter.route('/:id/addEvent').post(conversationsController.addEvent);
conversationsRouter.route('/:cid/events/:eid').get(conversationsController.getEvent);
conversationsRouter.route('/:cid/likeIcon/reset').put(conversationsController.resetLikeIcon);
conversationsRouter.route('/:cid/likeIcon').put(conversationsController.changeLikeIcon);
conversationsRouter.route('/:id/gallery').get(conversationsController.getGalleryMessages);
conversationsRouter.route('/forIds').post(conversationsController.getConversationsInfo);
conversationsRouter.route('/:id/getEncryptionData').post(conversationsController.getReencryptionData);
conversationsRouter.route('/:id/pushReencryptedMessages').post(conversationsController.pushReencryptedMessages);
conversationsRouter.route('/:id/changeKeySet').put(conversationsController.changeEncryptionKey);

export default conversationsRouter;
