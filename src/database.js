//import "../libraries/pouchdb-7.2.1.js";

/*********database functionality********/
//local DB using pouch
//used to store the user's ID
var pouchDB = {
  //create a local db
  local: new PouchDB('reminders'),
  //creates a user ID and adds it to the local db or gets an ID if one exists
  initUser: async () =>{
    try{
      //check the local db for a stored user code
      var result =  await pouchDB.local.get("_local/user");
      //assigned the returned id to the user_id variable
      database.user_id = result.user_id;
      console.log("user ID already exists: " + database.user_id);
    }
    catch (error){
      //if there is a 404 error returned then there is no user id so create one
      if(error.status !== undefined && error.status == 404){
        //generate a random semi unique number to use as the id
        var random = (Math.floor(Math.random() * 100) * Date.now());
        try{
          database.user_id = random;
          //add the new user to the server db
          await database.addNewUser();
          //add the new user id to the local db
          var localUser = await pouchDB.local.put({"_id": "_local/user", "user_id": random});
          console.log("New user added: " + database.user_id);
        }
        catch (error){
          throw error;
        }
      }
      else{
        //if the error is not a 404 throw the error
        throw error;
      }
    }
  },
  //resets the local user_id to a newly provided one
  recoverUser: async (new_id) =>{
    try{
      //get the currently saved user id in the local db
      var user = await pouchDB.local.get("_local/user");
      //add the new id to the local db
      user.user_id = new_id;
      var reset = await pouchDB.local.put(user);
      //set the current database user id to the new id
      database.user_id = new_id;
    }
    catch (error){
      throw error;
    }
  }
}
//remote server db
var database = {
  //unique identifier assigned to the user
  user_id: null,
 //gets all reminders for the user from the db
 getAllReminders: async () =>{
   //make a request to the server
   var response = await fetch("/getAllReminders", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body:JSON.stringify({"user_id":database.user_id})
  });
  //if the response contained an error throw a new error
  if(!response.ok){throw "Was not able to retrieve reminders at the time";}
  //parse the reminder data and return it
  var data = await response.json();
  return data;
 },
 //saves a reminder to the db
 saveReminder: async(newReminder) =>{
   //get the user id and the reminder details
   var save = {"user_id":database.user_id,"details":newReminder};
   var response = await fetch("/saveReminder", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body:JSON.stringify(save)
  });
  if(!response.ok){ throw "New reminder could not be saved at thie time";}
 },
 //deletes a reminder from the db
 deleteReminder: async (reminderID)=>{
   //get the user id and the reminder details
   var remove = {"user_id":database.user_id,"reminder_id":reminderID};
   var response = await fetch("/deleteReminder", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body:JSON.stringify(remove)
  });
  if(!response.ok){ throw "Reminder could not be deleted at this time";}
 },
 //adds a new user to the users db
 addNewUser: async() => {
     //get the user_id
     var save = {"user_id":database.user_id};
     var response = await fetch("/addNewUser", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body:JSON.stringify(save)
    });
    if(!response.ok){throw "New user profile could not be created. Reload and try again";}
  },
 //saves the user and the user's push subcription to the db
 saveUserSubscription: async(subscription) => {
     //get the user_id and the push subscription
     var save = {"user_id":database.user_id,"sub":subscription};
     var response = await fetch("/saveUserSub", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body:JSON.stringify(save)
    });
    if(!response.ok){throw "Could not save push subscription at this time";}
  },
  //saves the user's phone number to the users db
  saveUserPhoneNumber: async(phoneNumber) => {
      //get the user_id and the phone number
      var save = {"user_id":database.user_id,"phoneNumber":phoneNumber};
      var response = await fetch("/savephoneNumber", {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json'
       },
       body:JSON.stringify(save)
     });
     if(!response.ok){throw "Could not save phone number at this time";}
   },
   //returns a boolean of whether or not the user has set their phone number
   checkUserPhoneNumber: async() => {
       var send = {"user_id":database.user_id};
       var response = await fetch("/checkPhoneNumber", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body:JSON.stringify(send)
      });
      if(!response.ok){throw "Was not able to retrieve phone number at this time";}
      var data = await response.json();
      return data;
    },
    //requests an sms verification
    requestVerification: async(phoneNumber) => {
        var send = {"phoneNumber":phoneNumber};
        var response = await fetch("/requestVerification", {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
         body:JSON.stringify(send)
       });
       if(!response.ok){throw "Could not send sms verification at this time";}
     },
     //check if an sms verification is correct
     //if it is correct it will return the user's id
     checkVerification: async(phoneNumber,code) => {
         var send = {"phoneNumber":phoneNumber, "code":code};
         var response = await fetch("/checkVerification", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body:JSON.stringify(send)
        });
        if(!response.ok){throw "Was not able to verify sms at this time";}
        var data = await response.json();
        return data.user_id;
      }
}

export{pouchDB,database};
