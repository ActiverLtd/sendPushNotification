'use strict';

const request = require('request');
const admin = require('firebase-admin');

const app = admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.projectId,
        clientEmail: process.env.clientEmail,
        privateKey: process.env.privateKey.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.databaseUrl
});

const db = admin.database();

exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        }
    });

    const fetchToken = (uid, cb) => {
        console.log(`Retrieving token for user with id: ${uid}`);
        db.ref(`/users/${uid}/notificationId`).once('value').then(
            (snapshot) => {
                const token = snapshot.val();
                app.delete();
                if (!token) {
                    done({message: 'No token was found for this user id.'});
                }
                console.log(`Retrieved token: ${token}`);
                cb(token);
            },
            (errorObject) => {
                done({message: "The read failed: " + errorObject.code});
            }
        );
    };

    const sendNotification = (title, text, data) => {
        return (token) => {
            request.post(process.env.firebasePushUrl, {
                json: true,
                body: {
                    to: token,
                    notification: {
                        title,
                        body: text,
                        sound: 'default'
                    },
                    data
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key=${process.env.fcmServerKey}`
                }
            }, done);
        };
    };
    const {uid, title, text, data} = JSON.parse(event.body);
    console.log(`${title}: ${text} to ${uid}`);
    fetchToken(uid, sendNotification(title, text, data));
};

// exports.handler({body: JSON.stringify({uid: 'j5adkKasVJQFiT1GdXBC5of8KC13', title: 'testii', text: 'asd', data: {}})}, null, (err) => {console.log(err ? '400' : '200')});