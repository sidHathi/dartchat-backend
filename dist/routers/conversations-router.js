"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controllers_1 = require("../controllers");
const conversationsRouter = (0, express_1.default)();
conversationsRouter.route('/:id').get(controllers_1.conversationsController.getConversation);
conversationsRouter.route('/:id/messages').get(controllers_1.conversationsController.getConversationMessages);
conversationsRouter.route('/:cid/messages/:mid').get(controllers_1.conversationsController.getConversationMessage);
conversationsRouter.route('/:id/messagesToDate').post(controllers_1.conversationsController.getConversationMessagesToDate);
conversationsRouter.route('/delete/:id').delete(controllers_1.conversationsController.deleteConversation);
conversationsRouter.route('/:id/updateProfile').post(controllers_1.conversationsController.updateConversationProfile);
conversationsRouter.route('/:id/updateDetails').put(controllers_1.conversationsController.updateConversationDetails);
conversationsRouter.route('/:id/info').get(controllers_1.conversationsController.getConversationInfo);
conversationsRouter.route('/:id/updateNotStatus').put(controllers_1.conversationsController.updateUserNotStatus);
conversationsRouter.route('/:id/addUsers').put(controllers_1.conversationsController.addUsers);
conversationsRouter.route('/:id/removeUser').put(controllers_1.conversationsController.removeUser);
conversationsRouter.route('/:id/join').put(controllers_1.conversationsController.joinConvo);
conversationsRouter.route('/:id/leave').put(controllers_1.conversationsController.leaveConvo);
conversationsRouter.route('/:id/addPoll').post(controllers_1.conversationsController.addPoll);
conversationsRouter.route('/:cid/polls/:pid').get(controllers_1.conversationsController.getPoll);
conversationsRouter.route('/:id/addEvent').post(controllers_1.conversationsController.addEvent);
conversationsRouter.route('/:cid/events/:eid').get(controllers_1.conversationsController.getEvent);
conversationsRouter.route('/:cid/likeIcon/reset').put(controllers_1.conversationsController.resetLikeIcon);
conversationsRouter.route('/:cid/likeIcon').put(controllers_1.conversationsController.changeLikeIcon);
conversationsRouter.route('/:id/gallery').get(controllers_1.conversationsController.getGalleryMessages);
conversationsRouter.route('/forIds').post(controllers_1.conversationsController.getConversationsInfo);
conversationsRouter.route('/:id/getEncryptionData').post(controllers_1.conversationsController.getReencryptionData);
conversationsRouter.route('/:id/pushReencryptedMessages').post(controllers_1.conversationsController.pushReencryptedMessages);
conversationsRouter.route('/:id/changeKeySet').put(controllers_1.conversationsController.changeEncryptionKey);
conversationsRouter.route('/:cid/:mid').delete(controllers_1.conversationsController.deleteMessage);
conversationsRouter.route('/:cid/updateUserRole').put(controllers_1.conversationsController.updateUserRole);
exports.default = conversationsRouter;