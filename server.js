require('dotenv').config({ path: 'keys.env' });

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const compression = require('compression');//text compression for requested files
const cron = require('node-cron');//cron to regularly check and clean reminders
const { Client } = require('pg');//postgreSQL db connection
const moment = require("moment");//parses reminder timestamps
const Pushy = require('pushy');//push notifications

//twilio api credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const servicesSid = process.env.TWILIO_SERVICES_SID;
const twilioClient = require('twilio')(accountSid, authToken);

//pushy credentials
const pushyKey = process.env.PUSHY_API_KEY;
const pushyAPI = new Pushy(pushyKey);

//database client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
//connect to the db
client.connect();

//start the server
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

//Compress all HTTP responses
app.use(compression());
//parse incoming json requests
app.use(express.json());
//serve the static assets
app.use('/assets', express.static('assets'));
app.use('/libraries', express.static('libraries'));
app.use('/src', express.static('src'));
app.use('/', express.static('/'));

/***************routes***************/
app.get("/",(req,res) =>{
    res.sendFile(__dirname + '/index.html');
});

app.get("/manifest.json",(req,res) =>{
    res.sendFile(__dirname + '/manifest.json');
});

app.get("/service-worker.js",(req,res) =>{
    res.sendFile(__dirname + '/service-worker.js');
});

//adds a new user id to the db
app.post('/addNewUser', async (req,res) => {
  try{
    //insert the new user into the db
    const add = await client.query(`insert into users (user_id) values (${req.body.user_id})`);
    res.send("New user added");
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Failed to add new user to the db'});
  }
});

//updates a user's push subscription in the db
app.post('/saveUserSub', async (req,res) => {
  try{
    //check if this subscription is already in the db
    const duplicate = await client.query(`select * from users where sub = '${req.body.sub}'`);
    if(duplicate.rows.length > 0){
      throw "Push subscription is already in use";
    }
    //if the push sub is not already in the db
    else{
      //update the user's push sub with this new subscription
      const update = await client.query(`update users set sub = '${req.body.sub}' where user_id = ${req.body.user_id}`);
      res.send("User push subscription saved");
    }
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Failed to save the user push subscription'});
  }
});

//returns a user's push subcription
app.post('/checkUserSub', async (req,res) => {
  try{
    const sub = await client.query(`select sub from users where user_id = ${req.body.user_id}`);
    res.send(sub.rows[0]);
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Failed to get the user push subscription'});
  }
});

//updates a user's phone number in the db
app.post('/savephoneNumber', async (req,res) => {
  try{
    //check if the phone number is already in the db
    const duplicate = await client.query(`select * from users where phone = '${req.body.phoneNumber}'`);
    //if the phone number is not currently in the db
    if(duplicate.rows.length <= 0){
      //update the user's phone number
      const update = await client.query(`update users set phone = '${req.body.phoneNumber}' where user_id = ${req.body.user_id}`);
      res.send("Added user phone number");
    }
    else{
      throw "Phone number is already in use";
    }
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Failed to save the user phone number'});
  }
});

//returns true/false for if the user has a phone number saved to the db
app.post('/checkPhoneNumber', async (req,res) => {
  try{
    const phone = await client.query(`select phone from users where user_id = ${req.body.user_id}`);
    if(phone.rows[0].phone == null){
      res.send(false);
    }
    else{
      res.send(true);
    }
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Failed to check the user phone number'});
  }
});

//adds a reminder to the dbr
app.post('/saveReminder', async (req,res) => {
  try{
    //insert the new reminder into the db
    const add = await client.query(`insert into reminders (user_id, details) values (${req.body.user_id}, '${JSON.stringify(req.body.details).replace(/[\/\(\)\']/g, "''")}')`);
    res.send(add);
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Failed to add the reminder to the db'});
  }
});

//deletes a reminder from the db
app.post('/deleteReminder', async (req,res) => {
  try{
    //delete the reminder from the db
    const remove = await client.query(`delete from reminders where user_id = ${req.body.user_id} and details ->> 'reminder_id' = '${req.body.reminder_id}'`);
    res.send(remove);
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Failed to delete the reminder from the db'});
  }
});

//returns all reminders in the db for a specified user
app.post('/getAllReminders', async (req,res) => {
  try{
    //first clean the users reminders so we return the most up to date reminders to the client
   await cleanReminders(req.body.user_id);
    //get all the user's reminder details
    const details = await client.query(`select details from reminders where user_id = ${req.body.user_id}`);
    res.send(details.rows);
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Failed to return reminders from the db'});
  }
});

//sends a sms verification to the specified phone number using twilio
app.post('/requestVerification', async (req,res) => {
  try{
    const verification = await twilioClient.verify.services(servicesSid).verifications.create({to: `${req.body.phoneNumber}`, channel: 'sms'});
    res.send("Verification sent to phone");
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Failed to send verification sms'});
  }
});

//checks that a supplied verification code is correct
app.post('/checkVerification', async (req,res) => {
  try{
    const verification_check = await twilioClient.verify.services(servicesSid).verificationChecks.create({to: `${req.body.phoneNumber}`, code: `${req.body.code}`});
    //if the status returned is approved the correct code was given and the user was verified
    if(verification_check.status == "approved"){
      //get and return the user's saved id
      const user = await client.query(`select user_id from users where phone = '${req.body.phoneNumber}'`);
      res.send(user.rows[0]);
    }
    //the correct code was not given so throw and error
    else{
      throw "Verification code was incorrect";
    }
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Failed to verify sms'});
  }
});

//updates a the notified attribute of a reminder to be true
// is only set to true after the client confirms the push notification has been shown
app.post('/updateNotified', async (req,res) => {
  try{
    //parse the reminder data
    var reminder = JSON.parse(req.body.reminder);
    //set notified to true
    reminder.notified = true;
    //update the reminder in the db
    const update = await client.query(`update reminders set details = '${JSON.stringify(reminder).replace(/[\/\(\)\']/g, "''")}' where user_id = ${req.body.user_id} and details ->> 'reminder_id' = '${reminder.reminder_id}'`);
    console.log("Reminder notified is now true");
    res.send("Reminder notified is now true");
  }
  catch (error){
    console.log(error);
    res.status("500").send({message: 'Failed to update reminder notified'});
  }
});


//runs checks on the remidners every 1 minute
cron.schedule('* * * * * ', async () => {
  console.log("Current time: " + moment.utc().format("X"));
  try{
    //the time right now as a utc timstamp
    const now = moment.utc().format("X");
    //get all users from db
    const users = await client.query(`select * from users`);
    const allUsers =  users.rows;
    //loop through all users
    for(let i = 0; i < allUsers.length; i++){
      //the current user id
      const user_id = allUsers[i].user_id;
      //the current user phone number
      const phone = allUsers[i].phone == null ? null : allUsers[i].phone;
      //the current user push notification subscription
      const subscription = allUsers[i].sub == null ? null : [allUsers[i].sub];
      //clean the user's reminders
      await cleanReminders(user_id);
      console.log("Reminders cleaned");
      //push sub options
      const options = {time_to_live:30};
      //get all remindres for the current user
      const reminders = await client.query(`select details from reminders where user_id = ${user_id}`);
      const allReminders = reminders.rows;
      //loop through all the user's reminders
      for(let x = 0; x < allReminders.length; x++){
        const reminder = allReminders[x].details;
        //send a push notification if the reminder is:
          //not an all day reminder
          //coming up in less then 60 minutes but has not already happened
          //has not already had a notication
          //the user phone is not null
        if((reminder.timeStamp - now <= 3600 && reminder.timeStamp - now >= 0 ) && !reminder.allDay && !reminder.notified && phone !== null){
          console.log("sending notification to: " + subscription);
          //since these reminders are time sensative the notification NEEDS to be sent reliably
          //use twilio to send the reminder notification as an sms if the user has input a phone number
          twilioClient.messages.create({
             body: 'Coming up soon: ' + reminder.title,
             from: '+19847894515',
             to: phone
           });
        }
        //send a push notification if the reminder is an all day reminder, is coming up in less then 24 hours, and the user push sub is not null
        else if(reminder.allDay && (reminder.timeStamp - now <= 86399 && reminder.timeStamp - now >= 0 )  && !reminder.notified && subscription !== null){
          const payload = {title: 'You have a reminder coming up!',body: reminder.title, user_id: user_id, reminder:reminder};
          console.log("sending notification to: " + subscription);
          pushyAPI.sendPushNotification(payload, subscription, options, async (err, id)=>{
            if (err) {return console.log("Error sending push notification: " + err);}
          });
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
  //get all the uer's reminders
  const result = await client.query(`select details from reminders where user_id = ${user_id}`);
  const reminders = result.rows;
  //the unix time right now
  const now = moment.utc().format("X");
  //loop through all returned reminders
  for(let i = 0; i < reminders.length; i++){
    //get the reminders timestamp, repeat, and id
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
      //update the reminder details with the new time
      const result = await client.query(`update reminders set details = '${JSON.stringify(updated).replace(/[\/\(\)\']/g, "''")}' where user_id = ${user_id} and details ->> 'reminder_id' = '${reminder_id}'`);
    }
    //otherwise if the reminder is in the past and does not repeat
    else if(reminderTime <= now && reminderRepeat == "Never"){
      //delete the reminder from the db
      const result = await client.query(`delete from reminders where user_id = ${user_id} and details ->> 'reminder_id' = '${reminder_id}'`);
    }
  }
}
