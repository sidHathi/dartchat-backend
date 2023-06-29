import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import * as http from 'http';
import { Server } from 'socket.io';

import { profilesRouter, usersRouter, socketsRouter, conversationsRouter } from './routers';
import { isAuthenticated, socketAuth } from './middleware';

dotenv.config();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
// use for auth:
app.use('/users', isAuthenticated, usersRouter);
app.use('/profiles', isAuthenticated, profilesRouter);
app.use('/conversations', isAuthenticated, conversationsRouter);
// app.use('/users', usersRouter);
// app.use('/profiles', profilesRouter);

const server = http.createServer(app);
const io = new Server(server);

io.use(socketAuth).on('connection', socketsRouter);

// start the server
server.listen(process.env.BACK_PORT, () => {
    console.log(`server running : http://${process.env.BACK_HOST}:${process.env.BACK_PORT}`);
});
