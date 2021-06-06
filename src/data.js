/**********Data for rendering app views************/
import {Swiper} from "./swipe.js";

//events for interacting with the UI
var events = {
  reminderSwipe: new Swiper(database.deleteReminder),
  onRepeatClick: (e) =>{
    //get all the repeat buttons
    var allRepeatButtons = document.querySelectorAll(".repeatItem");
    //loop through all the buttons
    allRepeatButtons.forEach((item, i) => {
      //remove selected class from each button
      item.classList.remove("selected");
    });
    //add selected class to the clicked button
    e.target.classList.add("selected");
  }
}


////data and functionality for related to reminders
var reminders = {
  //reminders for the current day
  today: [],
  //reminders that are later then the current day
  upcoming:[],
  //sorts all reminders into either today or upcoming
  sort: async ()=>{
    //empty out the arrays
    reminders.today = [];
    reminders.upcoming = [];
    //the unix time right now
    var currentTime = moment().format("X");
    //the unix time that the current day ends at
    var endOfDay = moment().endOf("day").format("X");
    //get all the reminders
    var all = await database.allReminders();
    //loop through all returned reminders
    for(var i = 0; i < all.rows.length; i++){
      //the timestamp of the current reminder
      var reminderTime = all.rows[i].doc.timeStamp;
      //the reminder timestamp is between now and the end of the current day
      if(reminderTime >= currentTime && reminderTime <= endOfDay){
        //add this reminder to todays reminders
        reminders.today.push(all.rows[i].doc);
      }
      //the reminder is sometime after the end of the current day
      else if(reminderTime > endOfDay){
        //add this reminder to upcoming reminders
        reminders.upcoming.push(all.rows[i].doc);
      }
    }
    //sort the arrays based on timestamp in acending order
    reminders.upcoming.sort((a,b) => a.timeStamp - b.timeStamp);
    reminders.today.sort((a,b) => a.timeStamp - b.timeStamp);
  },
  //validates reminder inputs and returns all data needed for reminder
  gatherReminderData: () =>{
    //the current date selected by the date picker
    var pickerDate = document.querySelectorAll("input#dateOpen")[0].value;
    //the current time selected by the time picker
    var pickerTime = document.querySelectorAll("input#timeOpen")[0].value;
    //if the reminder is flagged as all day or not
    var allDay = document.querySelectorAll("input.noTime")[0].checked;

    //the time to use for the reminder
    //for all day reminders time  should default to the end of the day
    //non all day reminders should use the time selected by the time picker
    var selectedTime = allDay ?  "11:59 PM" : pickerTime;

    //title of the reminder
    var title = document.querySelectorAll(".titleInput")[0].value;
    //the repeat frequency of the reminder
    var repeat = document.querySelectorAll(".repeatItem.selected")[0].attributes.data.value;
    //date and time formatted as a unix timestamp
    var timeStamp = moment(pickerDate + " " + selectedTime, "YYYY-MM-DD HH:mm A").format("X");
    //day of the week for the selected time
    var weekDay = moment.unix(timeStamp).format("ddd");
    //the selected time formatted as a human readable date
    var date = moment.unix(timeStamp).format("MM/DD/YYYY");
    //the time of the selected date and time
    var time = allDay ? "All day" : moment.unix(timeStamp).format("LT");

    //create the reminder object with the provided data
    var reminder ={
      title: title,
      repeat: repeat,
      allDay: allDay,
      timeStamp: timeStamp,
      weekDay: weekDay,
      date: date,
      time: time,
      notified: false //flags if this reminder has had a notification sent to the user
    }

    //validate that there is a title filled in
    if(reminder.title == ""){
      throw "Reminder must have a title";
    }

    //validate that the selected date and time are not in the past
    if(reminder.timeStamp < moment().format("X")){
      throw "Reminder can't be in the past";
    }

    return reminder;
  }
}

//push notificaiton functionality
var push = {
  //registraion after the service worker has been registered
  swRegistration: null,
  //registers the service worker
  registerWorker: async () =>{
    if ('serviceWorker' in navigator) {
      var registration = await navigator.serviceWorker.register('service-worker.js');
      push.swRegistration = registration;
      console.log("service worker registered");
    }
    else{
      throw "Service Workers not supported";
    }
  },
  //requests notification permissions
  requestPermissions: async () =>{
    if('PushManager' in window){
      var result = await Notification.requestPermission();
      return result;
    }
    else{
      throw "Push not supported";
    }
  },
  //subscribes the user to push
  subscribeUser: async () =>{
    var subbed =  await push.swRegistration.pushManager.getSubscription();
    //subscribe the user if they are not already
    if(!subbed){
      //convert the public key
      var publicKey = urlBase64ToUint8Array("BKd7x3X7jqttW_W2eFJPJQ9IrLlatDywpZffn4wZp8Pnuq8pOj9lWV5vxjm0d2XASC_3b-15G4ChcuB3bai9P-s");
      //subscribe the user to push notifications
      var subscription = await push.swRegistration.pushManager.subscribe({userVisibleOnly: true,applicationServerKey: publicKey});
      //save the subscription to the user json file
      await saveSubscription(subscription);

      console.log("User subscribed to push notifications");
    }
    else{
      console.log("Already subscribed");
    }
  },
  //checks reminders and sends notifications for any reminders that are set for the current time
  notifyUser: async () =>{
    //get all reminders
    var all = await database.allReminders();
    //the current time
    var now = moment().format("X");
    //how much time before a reminder's timestamp a notification should go out to the user
    var notifyTime = 900; //15 minutes
    //loop through all the reminders
    for(var i = 0; i < all.rows.length; i++){
      var timestamp = all.rows[i].doc.timeStamp;
      var allDay = all.rows[i].doc.allDay;
      var notified = all.rows[i].doc.notified;
      //if the time between now and the reminder timestamp is less then the notify time
      //and the reminder is not an all day reminder
      //and a notificatio was not already sendNotification
      if((timestamp - now <= notifyTime) && (!allDay) && (!notified)){
        //send a notification for the reminder
        push.swRegistration.showNotification("Don't forget....",{
           body: all.rows[i].doc.title
         });
         //update the reminder notified property to true
         var id = all.rows[i].doc._id;
         var updated = {
           title: all.rows[i].doc.title,
           repeat: all.rows[i].doc.repeat,
           allDay: all.rows[i].doc.allDay,
           timeStamp: all.rows[i].doc.timeStamp,
           weekDay: all.rows[i].doc.weekDay,
           date: all.rows[i].doc.date,
           time: all.rows[i].doc.time,
           notified: true
         }
         await database.updateReminder(id,updated);
      }
    }
  }
}


//adds the user ID and push subscription to the user json file
 async function saveSubscription(subscription) {
  var user =  await database.local.get("_local/user");
  var newUser = {"id:":user.code,"sub":subscription};
  try{
    //send new user data to the server
    var response = await fetch("/addUser", {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json'
     },
     body:JSON.stringify(newUser)
   });
   console.log("New user added");
  }
  catch(error){
    console.log(error);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


export{events,reminders,push};
