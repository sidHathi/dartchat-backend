import express from 'express';
import { conversationsController } from '../controllers';

const conversationsRouter = express();

conversationsRouter.route('/:id').get(conversationsController.getConversation);
conversationsRouter.route('/delete/:id').delete(conversationsController.deleteConversation);

export default conversationsRouter;
