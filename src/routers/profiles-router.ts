import express from 'express';
import { profilesController } from '../controllers';

const profilesRouter = express();

profilesRouter.route('/search').post(profilesController.findProfile);
profilesRouter.route('/:id').get(profilesController.getProfile);
profilesRouter.route('/forIds').post(profilesController.getProfiles);

export default profilesRouter;
