"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationsController = exports.usersController = exports.profilesController = void 0;
const profiles_controller_1 = __importDefault(require("./profiles-controller"));
exports.profilesController = profiles_controller_1.default;
const users_controller_1 = __importDefault(require("./users-controller"));
exports.usersController = users_controller_1.default;
const conversations_controller_1 = __importDefault(require("./conversations-controller"));
exports.conversationsController = conversations_controller_1.default;
