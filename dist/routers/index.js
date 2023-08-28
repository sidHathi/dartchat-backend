"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationsRouter = exports.socketsRouter = exports.usersRouter = exports.profilesRouter = void 0;
const profiles_router_1 = __importDefault(require("./profiles-router"));
exports.profilesRouter = profiles_router_1.default;
const users_router_1 = __importDefault(require("./users-router"));
exports.usersRouter = users_router_1.default;
const sockets_router_1 = __importDefault(require("./sockets-router"));
exports.socketsRouter = sockets_router_1.default;
const conversations_router_1 = __importDefault(require("./conversations-router"));
exports.conversationsRouter = conversations_router_1.default;
