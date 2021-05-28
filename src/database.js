/*********database functions********/
var database = {
  //the local reminders db
  local: new PouchDB('reminders'),
  //remote db for reminders associated with the user
  remote: null,
  //remote db containing all uers
  allUsers: new PouchDB(window.location.protocol + "//" + window.location.hostname + ':5984/users'), //remote db containing all users
  //sets up the remote reminder db for this specific user
  initRemote: async () =>{
    try{
      //check the local db for a stored user code
      var user =  await database.local.get("_local/user");
      //if there is aready a stored code use it to set the remote to the correct db
      database.remote = new PouchDB(window.location.protocol + "//" + window.location.hostname + ':5984/' + user.code);
    }
    catch (error){
      //if there is a 404 error returned then there is no user code thus no remote db yet so we create one
      if(error.status = 404){
        //generate a random semi unique number to use as the user code
        var userCode = (Math.floor(Math.random() * 100) * Date.now());
        try{
          //add the new user code to the local db
          var localUser = await database.local.put({"_id": "_local/user", "code": userCode});
          //create a new remote db to store reminders for this user
          database.remote = new PouchDB(window.location.protocol + "//" + window.location.hostname + ':5984/' + userCode);
          //call the api to initalize the new remote
          var newDB = await database.remote.info();

          console.log(newDB);
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
    //sync the local and remote dataases
    database.syncDatabases();

    console.log("remote database initalized");
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

      database.syncDatabases();

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

    database.syncDatabases();

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

    database.syncDatabases();

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
  syncDatabases: async () => {//syncs the local and remote databases
    try{
      var sync = await database.local.sync(database.remote);
      console.log(sync);
    }
    catch (error){
      console.log(error);
    }
  },
  saveSubscription: async(subscription) => {//creates a new user in the user remote db and saved the push subscription
    var user =  await database.local.get("_local/user");
    //add the user code and push subscription to the remote user db
    var remoteUser = await database.allUsers.put({"_id:":user.code,"sub":subscription});
  }
}


export{database};
