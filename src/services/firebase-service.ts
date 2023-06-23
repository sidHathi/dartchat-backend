import * as admin from 'firebase-admin';

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://dartchat-a35b5.firebaseio.com'
});

export default admin;
