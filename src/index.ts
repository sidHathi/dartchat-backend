import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

// declare a route with a response
app.get('/', (req, res) => {
    res.send("What's up doc ?!");
});

// start the server
app.listen(process.env.BACK_PORT, () => {
    console.log(`server running : http://${process.env.BACK_HOST}:${process.env.BACK_PORT}`);
});
