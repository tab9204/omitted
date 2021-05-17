/*********database functions********/
var database = {
  local: new PouchDB('reminders'),
  remote: null,//remote db associated with the user
  user: null,//unique code that identifys the user
  setUser: ()=>{//creates a unique user id and stores it in the local db
    database.local.allDocs({include_docs: true, descending: true}, function(err, doc) {//get all docs in the db
      for(var i = 0; i <= doc.rows.length; i++){//loop through all docs
        if(doc.rows.length != 0 && doc.rows[i].id == "userCode"){//check if one of them is the user code
          database.user = doc.rows[i].doc.code;//if a user code is found update the user with the stored code
          database.remote = new PouchDB('http://localhost:5984/'+database.user+"-reminders");//set the remote db with the user code
          break;//exit the loop
        }
      }
      if(database.user == null){//if a user code was not found in the db create one
        var code = (Math.floor(Math.random() * 100) * Date.now())//generate a random number to be used as the code
        var userCode = {
          "_id": "userCode",
          "code": code
        }
        database.local.put(userCode);//add the user code to the local db
        database.user = userCode.code;//update the user with the new code
        database.remote = new PouchDB('http://localhost:5984/'+database.user+"-reminders");//set the remote db
        database.local.replicate.to(database.remote);//replicate the local db to the new remote
      }
    });
  },
  addReminder: (newReminder)=>{//adds a reminder to the db
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

    return database.local.put(reminder).then((result) =>{
      return 'New reminder posted!'
    }).catch((error) =>{
      return error;
    });
 },
 deleteReminder: (reminderID)=>{//removes a reminder to the db
   return database.local.get(reminderID).then((doc) => {
     return database.local.remove(doc);
   }).then((result) => {
     return "reminder removed";
   }).catch((error) => {
      return error;
   });
 },
 updateReminder: (reminderID,newData)=>{//updates a reminder with a new timestamp
   return database.local.get(reminderID).then((doc) => {
    return database.local.put({
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
  }).then((result) => {
     return "reminder updated";
   }).catch((error) => {
      return error;
   });
 },
 allReminders: () =>{//returns a promise that resolves with all of the reminders in the db
    return database.local.allDocs({
      include_docs: true, descending: true
    }).then((result)=>{
      return result;
    }).catch((error) => {
       return error;
    });
  }
}


export{database};
