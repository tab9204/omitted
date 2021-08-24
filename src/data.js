/**********Data for rendering app views************/
import {Swiper} from "./swipe.js";
import {database} from './database.js';


//events for interacting with the UI
var events = {
  //when a reminder is swiped
  reminderSwipe: new Swiper(async (id,index) => {
    //remove the reminder from the db
    database.deleteReminder(id);
  }),
  //when the visibility has changed
  appOpen: () =>{
    document.addEventListener('visibilitychange', async (e) =>{
      //if the app is being opened up
      if(document.visibilityState == "visible"){
        //sort the remindrs and reload the view
        await reminders.sort();
        m.redraw();
      }
    });
  },
  //when a repeat button is clicked
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
  },
  refreshSwiping: false,
  //when the app is swiped for refresh
  refreshSwipe: () =>{
    //the Y postion when the user firsts presses down
    var startY;
    //The Y position when the container has been screen to its top position
    var topStartY = 0;
    //how many px the user has swiped down since reaching the top of the container
    var deltaY = 0;
    //the part of the screen listening to the swipe events
    var appScreen =  document.querySelector(".pageContent");
    var loadingIcon = document.querySelector(".miniLoading");

    //how many px the screen must be dragged before the refresh is activated
    var buffer = screen.height * .2;


    appScreen.addEventListener('touchstart', (e)=>{
      //set the startY
      startY = e.touches[0].pageY;

      loadingIcon.style.top = "-45px";
      loadingIcon.classList.remove("slideUp");

    }, {passive: true});

    appScreen.addEventListener('touchmove', e => {
      if(events.reminderSwipe.swiping){
        return;
      }

      events.refreshSwiping = true;

      var y = e.touches[0].pageY;

      //if the container is at the top of its scroll and the user is swiping down
      if (appScreen.scrollTop === 0 && y > startY) {


        appScreen.style.overflowY = "clip";
        //set the starting top Y if it has not already been set
        if(topStartY <= 0){
          topStartY = y;
        }
        //how many px the use has swiped down since reaching the top of the container
        deltaY = y - topStartY;

        if(deltaY <= buffer){
          console.log(deltaY);
          loadingIcon.style.top = (-45 + deltaY)+"px";
        }
    }
  }, {passive: false});

  appScreen.addEventListener('touchend', e => {

    events.refreshSwiping = false;

    topStartY = 0;

    loadingIcon.classList.add("slideUp");

    appScreen.style.overflowY = "scroll";

    if(deltaY >= buffer){
      window.location = "#!/loading";
    }

  },{passive: true});

  }
}


//data and functionality for related to reminders
var reminders = {
  //all reminders for the user
  all:[],
  //gets all reminders and then sorts them from soonest to latest
  sort: async ()=>{

    var all = await database.getAllReminders();

    //stores the new reminders
    var newAll = [];

    //loop through all reminders
    for(var i = 0; i < all.length; i++){;
      //add the reminder to the array
      newAll.push(all[i].details);

    }
    //sort the arrays based on timestamp in acending order
    newAll.sort((a,b) => a.timeStamp - b.timeStamp);


    //update the existing array with the new reminders
    reminders.all = newAll;
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
      var registration = await navigator.serviceWorker.register('service-worker.js', {type: 'module'});
      worker.swRegistration = registration;
      console.log("service worker registered");
      //if the registration has been changed update it
        worker.swRegistration.update();

    }
    else{
      console.log("Service Workers not supported");
    }
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
