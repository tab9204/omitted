/*********database functions********/
var database = {
  //the local reminders db
  local: new PouchDB('reminders'),
  //creates a unique user ID for the current user
  initUser: async () =>{
    try{
      //check the local db for a stored user code
      var user =  await database.local.get("_local/user");
    }
    catch (error){
      //if there is a 404 error returned then there is no user code thus no remote db yet so we create one
      if(error.status = 404){
        //generate a random semi unique number to use as the user code
        var userCode = (Math.floor(Math.random() * 100) * Date.now());
        try{
          //add the new user code to the local db
          var localUser = await database.local.put({"_id": "_local/user", "code": userCode});
          console.log("user ID created");
        }
        catch (error){
          console.log(error);
        }
      }
      else{
        //if the error is not a 404 then log the error
        console.log(error);
      }
    }
  },
  addReminder: async (newReminder)=>{//adds a reminder to the db
    var reminder = {
      _id: "reminder-" + (Math.floor(Math.random() * 100) * Date.now()),//generate a random id
      title: newReminder.title,
      repeat: newReminder.repeat,
      allDay: newReminder.allDay,
      timeStamp:newReminder.timeStamp,
      weekDay:newReminder.weekDay,
      date:newReminder.date,
      time:newReminder.time
    }
    try{
      await database.local.put(reminder);

      console.log('New reminder posted!');
    }
    catch (error){
      console.log(error)
    }
 },
 deleteReminder: async (reminderID)=>{//removes a reminder to the db
   try{
     var doc = await database.local.get(reminderID);

     await database.local.remove(doc);

    console.log('reminder removed');
   }
   catch (error){
     console.log(error);
   }
 },
 updateReminder: async (reminderID,newData)=>{//updates a reminder with a new timestamp
   try{
     var doc = await database.local.get(reminderID);

     await database.local.put({
       _id: doc._id,
       _rev: doc._rev,
       title: newData.title,
       repeat: newData.repeat,
       allDay: newData.allDay,
       timeStamp:newData.timeStamp,
       weekDay:newData.weekDay,
       date:newData.date,
       time:newData.time,
       notified: newData.notified
     });

     console.log('reminder updated');
   }
   catch (error){
     console.log(error);
   }
 },
 allReminders: async () =>{//returns a promise that resolves with all of the reminders in the db
   try{
     var all = await database.local.allDocs({include_docs: true, descending: true});
     return all;
   }
   catch(error){
     console.log(error);
   }
 },
 //cleans and organizes the db by:
 //incrementing any reminders that have a repeat frequency
 //deleting old reminders that are no longer in use
 cleanDatabase: async() =>{
   //the unix time right now
   var currentTime = moment().format("X");
   //array containing promises for all db actions taken
   var dbActions = [];
   //all reminders in the db
   var all = await database.allReminders();

   for(var i = 0; i < all.rows.length; i++){//loop through all returned reminders

     var reminderTime = all.rows[i].doc.timeStamp;//timestamp on the reminder
     var reminderRepeat =  all.rows[i].doc.repeat;//the repeat of the reminder

     //if the reminder has already happened but has a repeat requency
     if(reminderTime <= currentTime && reminderRepeat !== "Never"){
       var id = all.rows[i].doc._id;
       //increment the timestamp, date, and weekday by the repeat frequency and update the reminder in the db
       var newTimestamp = moment.unix(reminderTime).add(1,reminderRepeat).format("X");
       var newWeekDay = moment.unix(newTimestamp).format("ddd");
       var newDate = moment.unix(newTimestamp).format("MM/DD/YYYY");
       //all reminder data is the same except for the timestamp, date, and weekday
       var updated = {
         title: all.rows[i].doc.title,
         repeat: all.rows[i].doc.repeat,
         allDay: all.rows[i].doc.allDay,
         timeStamp: newTimestamp,
         weekDay: newWeekDay,
         date: newDate,
         time: all.rows[i].doc.time,
         notified: all.rows[i].doc.notified
       }
       await database.updateReminder(id,updated);
     }
     //otherwise if the reminder is in the past and does not repeat
     else if(reminderTime <= currentTime && reminderRepeat == "Never"){
       //delete the reminder from the db
       await database.deleteReminder(all.rows[i].doc._id);
     }
   }
   console.log("database cleaned");
 }
}
