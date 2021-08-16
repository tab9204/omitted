require('dotenv').config({ path: 'keys.env' });

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const webPush = require('web-push');
const fs = require('fs');
const cron = require('node-cron');
const { Client } = require('pg');
const moment = require("moment");

//database client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect();

//push notification keys
const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

webPush.setVapidDetails('mailto:nimdhiran@gmail.com', publicVapidKey, privateVapidKey);

server.listen(process.env.PORT || 3000, () => {
  console.log('Server started');
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

app.use(express.json());
//serve the assets
app.use('/assets', express.static('assets'));
app.use('/libraries', express.static('libraries'));
app.use('/src', express.static('src'));
app.use('/', express.static('/'));

/***************Server routes***************/
app.get("/",(req,res) =>{
    res.sendFile(__dirname + '/index.html');
});

app.get("/manifest.json",(req,res) =>{
    res.sendFile(__dirname + '/manifest.json');
});

app.get("/service-worker.js",(req,res) =>{
    res.sendFile(__dirname + '/service-worker.js');
});

//adds a new user to the db
app.post('/saveUserSub', async (req,res) => {
  try{
    //insert the new user and sub into the db
    const result = await client.query(`insert into users (user_id, sub) values (${req.body.user_id}, '${JSON.stringify(req.body.sub)}')`);
    res.send("User subscription saved");
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'User subscription failed to save to db'});
  }

});

//adds a reminder to the db for a specified user
app.post('/saveReminder', async (req,res) => {
  try{
    //insert the new user and sub into the db
    const result = await client.query(`insert into reminders (user_id, details) values (${req.body.user_id}, '${JSON.stringify(req.body.details).replace(/[\/\(\)\']/g, "''")}')`);
    res.send(result);
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Reminder could not be added to the db'});
  }

});

//removes a reminder from the db for a specified user
app.post('/deleteReminder', async (req,res) => {
  try{
    //delete the reminder from the db
    const result = await client.query(`delete from reminders where user_id = ${req.body.user_id} and details ->> 'reminder_id' = '${req.body.reminder_id}'`);
    res.send(result);
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Reminder could not be deleted to the db'});
  }

});

//returns all reminders for a specified user
app.post('/getAllReminders', async (req,res) => {
  try{
    //first clean the users reminders so we return the most up to date reminders to the client
   await cleanReminders(req.body.user_id);
    //get all reminder details for the user
    const result = await client.query(`select details from reminders where user_id = ${req.body.user_id}`);
    res.send(result.rows);
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Could not retrieve reminders from the db'});
  }

});


//check for upcoming reminders every minute
cron.schedule('* * * * * ', async () => {
  console.log("Checking reminders");
  try{
    console.log("Current time: " + moment.utc().format("X"));
    //the time right now as a utc timstamp
    const now = moment.utc().format("X");
    //get all users from db
    const users = await client.query(`select * from users`);
    const allUsers =  users.rows;
    //loop through all users
    for(let i = 0; i < allUsers.length; i++){
      //the current user id
      const user_id = allUsers[i].user_id;
      //clean the db for the user
      await cleanReminders(user_id);
      //the current user push notification subscription
      const subscription = allUsers[i].sub;
      //get all remindres for the current user
      const reminders = await client.query(`select details from reminders where user_id = ${user_id}`);
      const allReminders = reminders.rows;
      //loop through all the user's reminders
      for(let x = 0; x < allReminders.length; x++){
        const reminder = allReminders[x].details;
        //send a push notification if the reminder is
          //coming up in less then 30 minutes but has not already happened
          //is not an all day reminder
          //has not already had a notication sent
        if((reminder.timeStamp - now <= 1800 && reminder.timeStamp - now >= 0 ) && !reminder.allDay && !reminder.notified){
          const payload = JSON.stringify({
            title: 'You have a reminder coming up!',
            body: reminder.title
          });
          //send push notification
          webPush.sendNotification(subscription, payload).catch(error => console.error(error));

          //set the reminder notifed to true and update the reminder db
          reminder.notified = true;
          const update = await client.query(`update reminders set details = '${JSON.stringify(reminder).replace(/[\/\(\)\']/g, "''")}' where user_id = ${user_id} and details ->> 'reminder_id' = '${reminder.reminder_id}'`);
        }
        //if the reminder is all day and it is coming up in less then a day
        else if(reminder.allDay && (reminder.timeStamp - now <= 86399 && reminder.timeStamp - now >= 0 )  && !reminder.notified){
          const payload = JSON.stringify({
            title: "Don't forget this today!",
            body: reminder.title
          });
          //send push notification
          webPush.sendNotification(subscription, payload).catch(error => console.error(error));

          //set the reminder notifed to true and update the reminder db
          reminder.notified = true;
          const update = await client.query(`update reminders set details = '${JSON.stringify(reminder).replace(/[\/\(\)\']/g, "''")}' where user_id = ${user_id} and details ->> 'reminder_id' = '${reminder.reminder_id}'`);
          console.log("reminder updated");
        }

      }

    }
  }
  catch (error){
    console.log(error);
  }
});

//cleans and organizes a user's reminders in the db by:
//incrementing any reminders that have a repeat frequency
//deleting old reminders that are no longer in use
async function cleanReminders(user_id){
  const result = await client.query(`select details from reminders where user_id = ${user_id}`);
  //the unix time right now
  const now = moment.utc().format("X");

  const reminders = result.rows;

  for(let i = 0; i < reminders.length; i++){//loop through all returned reminders

    const reminderTime = reminders[i].details.timeStamp;
    const reminderRepeat =  reminders[i].details.repeat;
    const reminder_id = reminders[i].details.reminder_id;

    //if the reminder has already happened but has a repeat requency
    if(reminderTime <= now && reminderRepeat !== "Never"){
      //increment the timestamp, date, and weekday by the repeat frequency and update the reminder in the db
      const newTimestamp = moment.unix(reminderTime).add(1,reminderRepeat).format("X");
      const newWeekDay = moment.unix(newTimestamp).format("ddd");
      const newDate = moment.unix(newTimestamp).format("MM/DD/YYYY");
      //all reminder data is the same except for the timestamp and notified
      const updated = {
        reminder_id: reminder_id,
        title: reminders[i].details.title,
        repeat: reminders[i].details.repeat,
        allDay: reminders[i].details.allDay,
        timeStamp: newTimestamp,
        offset: reminders[i].details.offset,
        notified: false
      }
      const result = await client.query(`update reminders set details = '${JSON.stringify(updated).replace(/[\/\(\)\']/g, "''")}' where user_id = ${user_id} and details ->> 'reminder_id' = '${reminder_id}'`);
    }
    //otherwise if the reminder is in the past and does not repeat
    else if(reminderTime <= now && reminderRepeat == "Never"){
      //delete the reminder from the db
      const result = await client.query(`delete from reminders where user_id = ${user_id} and details ->> 'reminder_id' = '${reminder_id}'`);
    }

  }
  console.log("reminders cleaned");
}
