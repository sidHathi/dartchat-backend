"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const controllers_1 = require("../controllers");
const express_1 = __importDefault(require("express"));
const usersRouter = (0, express_1.default)();
usersRouter.route('/me').get(controllers_1.usersController.getCurrentUser);
usersRouter.route('/create').post(controllers_1.usersController.createNewUser);
usersRouter.route('/me/update').put(controllers_1.usersController.modifyCurrentUser);
usersRouter.route('/me/pushToken').post(controllers_1.usersController.updatePushTokens);
usersRouter.route('/me/archiveRemove/:id').post(controllers_1.usersController.archiveRemove);
usersRouter.route('/me/readKeyUpdates').post(controllers_1.usersController.readKeyUpdates);
usersRouter.route('/me/setKeySalt').post(controllers_1.usersController.setKeySalt);
usersRouter.route('/me/setSecrets').post(controllers_1.usersController.setSecrets);
usersRouter.route('/me/updatePublicKey').post(controllers_1.usersController.updatePublicKey);
exports.default = usersRouter;