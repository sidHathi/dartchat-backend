import { RequestHandler } from 'express';
import { profileService } from '../services';
import { getErrorMessage } from '../utils';

const findProfile: RequestHandler = async (req, res, next) => {
    try {
        if (!('qString' in req.query)) {
            res.status(422).send('Missing query string');
            throw new Error('Missing query string');
        }
        const qString = (req.query.qString || '') as string;
        const results = await profileService.profileSearch(qString);
        res.status(200).send(results);
    } catch (err) {
        next(err);
    }
};

const getProfile: RequestHandler = async (req, res, next) => {
    try {
        const id = req.params.id;
        const profile = await profileService.getProfile(id);
        res.status(200).send(profile);
    } catch (err) {
        const message = getErrorMessage(err);
        if (message === 'No user found for given id') {
            res.status(404).send(message);
        }
        next(err);
    }
};

const profilesController = {
    findProfile,
    getProfile
};

export default profilesController;
