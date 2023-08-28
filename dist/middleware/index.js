"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuth = exports.isAuthenticated = void 0;
const auth_middleware_1 = require("./auth-middleware");
Object.defineProperty(exports, "isAuthenticated", { enumerable: true, get: function () { return auth_middleware_1.isAuthenticated; } });
const socket_middleware_1 = __importDefault(require("./socket-middleware"));
exports.socketAuth = socket_middleware_1.default;
