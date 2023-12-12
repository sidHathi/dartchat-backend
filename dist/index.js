"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleDelete = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const http = __importStar(require("http"));
const socket_io_1 = require("socket.io");
const routers_1 = require("./routers");
const middleware_1 = require("./middleware");
const cloud_functions_1 = require("cloud-functions");
Object.defineProperty(exports, "scheduleDelete", { enumerable: true, get: function () { return cloud_functions_1.scheduleDelete; } });
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/users', middleware_1.isAuthenticated, routers_1.usersRouter);
app.use('/profiles', middleware_1.isAuthenticated, routers_1.profilesRouter);
app.use('/conversations', middleware_1.isAuthenticated, routers_1.conversationsRouter);
app.get('/', (req, res, next) => {
    res.status(204).send();
});
const server = http.createServer(app);
const io = new socket_io_1.Server(server, {
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true
    }
});
io.use(middleware_1.socketAuth).on('connection', (socket) => {
    (0, routers_1.socketsRouter)(socket, io);
});
server.listen(process.env.BACK_PORT, () => {
    console.log(`server running : http://${process.env.BACK_HOST}:${process.env.BACK_PORT}`);
});
