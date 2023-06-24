import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { profilesRouter, usersRouter } from './routers';
import { isAuthenticated } from './middleware';

dotenv.config();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
// use for auth:
// app.use('/users', isAuthenticated, usersRouter);
// app.use('/profiles', isAuthenticated, profilesRouter);
app.use('/users', usersRouter);
app.use('/profiles', profilesRouter);

// start the server
app.listen(process.env.BACK_PORT, () => {
    console.log(`server running : http://${process.env.BACK_HOST}:${process.env.BACK_PORT}`);
});
