/**********Data for rendering app views************/
import {Swiper} from "./swipe.js";

//events for interacting with the UI
var events = {
  reminderSwipe: new Swiper(async (id) => {
    database.deleteReminder(id);
    await reminders.sort();
  }),
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
  //reminders coming withing 24 hours
  upcoming:[],
  //reminders further then 24 hours away
  future: [],
  //sorts all reminders into either today or upcoming
  sort: async ()=>{

    var all = await database.getAllReminders();
    //the unix time right now
    var now = moment.utc().format("X");

    //stores the new reminders
    var newUpcoming = [];
    var newFuture = [];

    //loop through all reminders
    for(var i = 0; i < all.length; i++){
      //the timestamp of the current reminder
      var reminderTime = all[i].details.timeStamp;
      //if the reminder time is 24 hours or less from right now show the reminder as upcoming
      if(reminderTime - now <= 86399 && reminderTime - now >= 0){
        //add this reminder to todays reminders
        newUpcoming.push(all[i].details);
      }
      //if the reminder time is greater then 24 hours from now show it as a future reminder
      else if(reminderTime - now > 86400){
        //add this reminder to upcoming reminders
        newFuture.push(all[i].details);
      }
    }
    //sort the arrays based on timestamp in acending order
    newUpcoming.sort((a,b) => a.timeStamp - b.timeStamp);
    newFuture.sort((a,b) => a.timeStamp - b.timeStamp);

    //update the existing arrays with the new reminders
    //empty out the arrays
    reminders.upcoming = newUpcoming;
    reminders.future = newFuture;
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
    //the timezone offset of the timestamp
    //used to show the correct date of all day reminders
    var offset = moment.unix(timeStamp).utcOffset();

    //create the reminder object with the provided data
    var reminder = {
      reminder_id: (Math.floor(Math.random() * 100) * Date.now()),//generate a random id
      title: title,
      repeat: repeat,
      allDay: allDay,
      timeStamp: timeStamp,
      offset: offset,
      notified: false//if the reminder has had a notification sent to the user
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

//service worker functionality
var worker = {
  //registraion after the service worker has been registered
  swRegistration: null,
  //registers the service worker
  registerWorker: async () =>{
    if ('serviceWorker' in navigator) {
      var registration = await navigator.serviceWorker.register('service-worker.js');
      worker.swRegistration = registration;
      console.log("service worker registered");
    }
    else{
      console.log("Service Workers not supported");
    }
  },
  //registers periodic background sync
  registerSync: async () =>{

  },
  //requests notification permissions
  requestPermissions: async () =>{
    if('PushManager' in window){
      var result = await Notification.requestPermission();
      return result;
    }
    else{
      console.log("Push not supported");
      return "default";
    }
  },
  //subscribes the user to push
  subscribeUser: async (permission) =>{
    //check if there is an active push subscription
    var subbed =  await worker.swRegistration.pushManager.getSubscription();
    //if there is no push subscription and notification permissions have been granted
    if(!subbed && permission == "granted"){
      //convert the public key
      var publicKey = urlBase64ToUint8Array("BKd7x3X7jqttW_W2eFJPJQ9IrLlatDywpZffn4wZp8Pnuq8pOj9lWV5vxjm0d2XASC_3b-15G4ChcuB3bai9P-s");
      //subscribe the user to push notifications
      var subscription = await worker.swRegistration.pushManager.subscribe({userVisibleOnly: true,applicationServerKey: publicKey});
      //save the subscription to the db
      console.log("User subscribed to push notifications");

      return subscription;
    }
    else{
      throw "User is either already subbed to push or did not grant notification permissions";
    }
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


export{events,reminders,worker};
