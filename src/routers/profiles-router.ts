import express from 'express';
import { profilesController } from '../controllers';

const profilesRouter = express();

profilesRouter.route('/search').post(profilesController.findProfile);
profilesRouter.route('/:id').get(profilesController.getProfile);

export default profilesRouter;
