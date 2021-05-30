/*********database functions********/
var database = {
  //the local reminders db
  local: new PouchDB('reminders'),
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
       time:newData.time
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
  }
}


export{database};
