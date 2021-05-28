require('dotenv').config({ path: 'keys.env' });

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const PouchDB = require('pouchdb');
const webPush = require('web-push');
const moment = require("moment");
const cron = require('node-cron');

const pouchURL = process.env.pouch_url || 'http://localhost:5984/';
//db containing all users
const userDB = new PouchDB(pouchURL + 'users');

//keys for push notifications
const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

webPush.setVapidDetails('mailto:nimdhiran@gmail.com', publicVapidKey, privateVapidKey);

//check if a notification needs to go out every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log("cron running");
  //all users in the user db
  const allUsers = await userDB.allDocs({include_docs: true, descending: true});
  //unix timestamp for right now
  const now = moment().format("X");
  //loop through all uers
  for(let i = 0; i < allUsers.rows.length; i++){
    //the users unique code
    const userCode = allUsers.rows[0].doc.code;
    //the push notification subscription
    const subscription = allUsers.rows[0].doc.sub;
    //the remote db for this user
    const reminderDB = new PouchDB(pouchURL + userCode);
    //all the reminders in the remote db
    const allReminders = await reminderDB.allDocs({include_docs: true, descending: true});
    //loop through all the reminders
    for(let i = 0; i < allReminders.rows.length; i++){
      //the amount of time between now and the current reminder timestamp
      var timeUntil = allReminders.rows[i].doc.timeStamp - now;
      var allDay = allReminders.rows[i].doc.timeStamp.allDay;
      //if the time until the reminder goes off is between 30 min and 25 min increment the notifications vairable
      console.log(timeUntil);
      if((timeUntil <= 1800 && timeUntil >= 1500) && !allDay){
       const payload = JSON.stringify({
         title: 'You have a reminder coming up!',
         body: allReminders.rows[i].doc.title + " at " + allReminders.rows[i].doc.time
       });
       webPush.sendNotification(subscription, payload).catch(error => console.error(error));
      }
    }

  }
});


server.listen(process.env.PORT || 3000, () => {
  console.log('listening on *:3000');
});


//redirect to https if not already on https
if(process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https')
      res.redirect(`https://${req.header('host')}${req.url}`)
    else
      next()
  })
}

//serve the assets
app.use('/assets', express.static('assets'));
app.use('/libraries', express.static('libraries'));
app.use('/src', express.static('src'));
app.use('/', express.static('/'));

//serve the html file
app.get("/",(req,res) =>{
    res.sendFile(__dirname + '/index.html');
});

app.get("/manifest.json",(req,res) =>{
    res.sendFile(__dirname + '/manifest.json');
});

app.get("/service-worker.js",(req,res) =>{
    res.sendFile(__dirname + '/service-worker.js');
});

app.post('/subscribe', (req, res) => {
  const subscription = req.body
  console.log(req);
  res.status(201).json({});

  const payload = JSON.stringify({
    title: 'Push notifications with Service Workers',
  });

  webPush.sendNotification(subscription, payload)
    .catch(error => console.error(error));
});
