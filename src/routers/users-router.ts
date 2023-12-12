import { usersController } from '../controllers';
import express from 'express';

const usersRouter = express();

usersRouter.route('/me').get(usersController.getCurrentUser);
usersRouter.route('/create').post(usersController.createNewUser);
usersRouter.route('/me/update').put(usersController.modifyCurrentUser);
usersRouter.route('/me/pushToken').post(usersController.updatePushTokens);
usersRouter.route('/me/archiveRemove/:id').post(usersController.archiveRemove);
usersRouter.route('/me/readKeyUpdates').post(usersController.readKeyUpdates);
usersRouter.route('/me/setKeySalt').post(usersController.setKeySalt);
usersRouter.route('/me/setSecrets').post(usersController.setSecrets);
usersRouter.route('/me/updatePublicKey').post(usersController.updatePublicKey);
usersRouter.route('/me/updateUiTheme').put(usersController.updateUiTheme);
usersRouter.route('/me/setDevMode').put(usersController.setDevMode);

export default usersRouter;
