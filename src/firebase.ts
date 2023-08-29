/* eslint-disable @typescript-eslint/no-var-requires */
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const serviceAcc = require(process.env.FIREBASE_SERVICE_KEY_PATH || '');
admin.initializeApp({
    credential: admin.credential.cert(serviceAcc),
    databaseURL: process.env.FIREBASE_DB_URL || ''
});

export const db = admin.firestore();

export default admin;
