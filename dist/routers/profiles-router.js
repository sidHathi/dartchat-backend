"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controllers_1 = require("../controllers");
const profilesRouter = (0, express_1.default)();
profilesRouter.route('/search').post(controllers_1.profilesController.findProfile);
profilesRouter.route('/:id').get(controllers_1.profilesController.getProfile);
profilesRouter.route('/forIds').post(controllers_1.profilesController.getProfiles);
exports.default = profilesRouter;
