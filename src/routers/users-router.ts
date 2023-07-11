import { usersController } from '../controllers';
import express from 'express';

const usersRouter = express();

usersRouter.route('/me').get(usersController.getCurrentUser);
usersRouter.route('/create').post(usersController.createNewUser);
usersRouter.route('/me/update').put(usersController.modifyCurrentUser);
usersRouter.route('/me/pushToken').post(usersController.updatePushTokens);

export default usersRouter;
