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


const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect();


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

app.post('/saveReminder', async (req,res) => {
  try{
    //insert the new user and sub into the db
    const result = await client.query(`insert into reminders (user_id, details) values (${req.body.user_id}, '${JSON.stringify(req.body.details)}')`);
    res.send(result);
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Reminder could not be added to the db'});
  }

});

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

app.post('/updateReminder', async (req,res) => {
  try{
    //update the reminder
    const result = await client.query(`update reminders set details = '${JSON.stringify(req.body.new_data)}' where user_id = ${req.body.user_id} and details ->> 'reminder_id' = '${req.body.reminder_id}'`);
    res.send(result);
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Reminder could not be updated'});
  }

});

app.post('/getAllReminders', async (req,res) => {
  try{
    //insert the new user and sub into the db
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
  console.log("cron running");
  try{
    console.log("The date is: " + moment().format("MM/DD/YYYY hh:mm"));
    //the time right now as a unix timstamp
    const now = moment().unix();
    //get all users from db
    const users = await client.query(`select * from users`);
    const allUsers =  users.rows;
    //loop through all users
    for(let i = 0; i < allUsers.length; i++){
      //the current user id
      const user_id = allUsers[i].user_id;
      //the current user push notification subscription
      const subscription = allUsers[i].sub;
      //get all remindres for the current user
      const reminders = await client.query(`select details from reminders where user_id = ${user_id}`);
      const allReminders = reminders.rows;
      //loop through all the user's reminders
      for(let x = 0; x < allReminders.length; x++){
        const reminder = allReminders[x].details;
        //the date of the reminder
        const reminderDate = moment.unix(reminder.timeStamp).format("MM/DD/YYYY");
        //todays date
        const today = moment.unix(moment().unix()).format("MM/DD/YYYY");

        console.log(reminder.title + ": " + reminderDate + " vs " + today)
        //send a push notification if the reminder is
          //coming up in less then 30 minutes but has not already happened
          //is not an all day reminder
          //has not already had a notication sent
        if((reminder.timeStamp - now <= 1800 && reminder.timeStamp - now >= 0 ) && !reminder.allDay && !reminder.notified){
          const payload = JSON.stringify({
            title: 'You have a reminder coming up soon!',
            body: reminder.title
          });
          //send push notification
          webPush.sendNotification(subscription, payload).catch(error => console.error(error));

          //set the reminder notifed to true and update the reminder db
          reminder.notified = true;
          const update = await client.query(`update reminders set details = '${JSON.stringify(reminder)}' where user_id = ${user_id} and details ->> 'reminder_id' = '${reminder.reminder_id}'`);
        }
        //if the reminder is all day and it is the day of the reminder
        else if(reminder.allDay && reminderDate == today && !reminder.notified){
          const payload = JSON.stringify({
            title: "Don't forget this today!",
            body: reminder.title
          });
          //send push notification
          webPush.sendNotification(subscription, payload).catch(error => console.error(error));
          //set the reminder notifed to true and update the reminder db
          reminder.notified = true;
          const update = await client.query(`update reminders set details = '${JSON.stringify(reminder)}' where user_id = ${user_id} and details ->> 'reminder_id' = '${reminder.reminder_id}'`);
          console.log("reminder updated");
        }

      }

    }
  }
  catch (error){
    console.log(error);
  }
});
