/**********Data for rendering app views************/
import {Swiper} from "./swipe.js";
import {pouchDB,database} from './database.js';

//header component data
var header = {
  //recovery button click event
  recoveryBtnClick: () =>{
    //if the user saved a phone number send them to the recovery screen
    if(recovery.savedPhoneNumber){
      m.route.set('/recovery');
    }
    //otherwise route the user to the phone number save screen
    else{
      m.route.set('/phone');
    }
  },
  //add button click event
  addBtnClick: () =>{
    //route to the add screen
    m.route.set('/add');
  }
}

//reminder component data
var reminders = {
  //all reminders for the local day
  today:[],
  //all future reminders
  upcoming:[],
  //gets all reminders and sorts them into today and upcoming arrays
  sort: async ()=>{
    //arrays to store the new reminders from the db
    var newToday = [];
    var newUpcoming = [];
    //todays date in the user's local time
    var todayDate = moment().format("MM/DD/YYYY");
    //get all reminders
    var all = await database.getAllReminders();
    //loop through all reminders
    for(var i = 0; i < all.length; i++){
      //get the reminder's date in MM/DD/YYYY format from its unix timestamp
      //all day reminders should use the utc offset so that the user's current timezone is ignored
      //all other reminders can use the user's current timezone for its formatted date
      var reminderDate = all[i].details.allDay ? moment.unix(parseInt(all[i].details.timeStamp)).utcOffset(parseInt(all[i].details.offset)).format("MM/DD/YYYY") : moment.unix(all[i].details.timeStamp).format("MM/DD/YYYY");
      //if the reminder is today add it to the today array
      if(reminderDate <= todayDate){
        newToday.push(all[i].details);
      }
      //if the reminder is after today add it to the upcoming array
      else if(reminderDate > todayDate){
        newUpcoming.push(all[i].details);
      }
    }
    //sort the arrays based on timestamp in descending order
    newToday.sort((a,b) => a.timeStamp - b.timeStamp);
    newUpcoming.sort((a,b) => a.timeStamp - b.timeStamp);
    //update the existing arrays with the new reminders
    reminders.today = newToday;
    reminders.upcoming = newUpcoming;
  },
  //gets data from add screen input fields, validates the data, and returns all data needed to create a new reminder
  gatherReminderData: () =>{
    //the date selected by the date picker
    var pickerDate = document.querySelectorAll("input#dateOpen")[0].value;
    //the time selected by the time picker
    var pickerTime = document.querySelectorAll("input#timeOpen")[0].value;
    //if the reminder is flagged as all day or not
    var allDay = document.querySelectorAll("input.noTime")[0].checked;
    //the time to use for the reminder
    //for all day reminders time is set to 11:59 PM
    //non all day reminders should use the time selected by the time picker
    var selectedTime = allDay ?  "11:59 PM" : pickerTime;
    //the title of the reminder
    var title = document.querySelectorAll(".titleInput")[0].value;
    //the repeat frequency of the reminder
    var repeat = document.querySelectorAll(".repeatItem.selected")[0].attributes.data.value;
    //unix timestamp created from the selected date and time
    var timeStamp = moment(pickerDate + " " + selectedTime, "YYYY-MM-DD HH:mm A").format("X");
    //the timezone offset of the timestamp
    //used to show the correct date of all day reminders
    var offset = moment.unix(timeStamp).utcOffset();
    //reminder object with the input provided data
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
    //return the reminder data
    return reminder;
  },
  //reminder swipe event
  reminderSwipe: new Swiper(async (id,index) => {
    //remove the reminder from the db
    database.deleteReminder(id);
  }),
  //animation end event for when the sliding animation finishes
  animationEnd: (e) =>{
    //if the animation that ended was the slide out
    if(e.target.classList.contains("slideOut")){
      //remove the reminder from the dom
     e.currentTarget.remove();
     //get the index attr of the reminder
     var index = parseInt(e.currentTarget.getAttribute("index"));
     //get the id attr of the reminder
     var reminder_id = e.currentTarget.getAttribute("id");
     //check if the reminder being deleted is in the today array using the reminder id
     var today = reminders.today.find((e)=>{return e.reminder_id == reminder_id});
     //if the reminder id was found in the today array then remove it from that array
     if(today !== undefined){
       reminders.today.splice(parseInt(index),1);
     }
     //if the remidner was not in the today array it is in the upcoming array so remove it from that array
     else{
        reminders.upcoming.splice(parseInt(index),1);
     }
    }
    //if the animation that ended was the slide in
    else if(e.target.classList.contains("slideIn")){
      //set the reminder left style back to the default 0px
      e.currentTarget.style.left = "0px";
      //remove the slideIn class from the reminder
      e.target.classList.remove("slideIn");
    }
  }
}

//repeatBtn button component functions and data
var repeatBtn = {
  //click event
  click: (e) =>{
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

//phone input component functions and data
var phoneInput = {
  //when the component is created and added to the dom
  created: () =>{
    //auto focus the area code input
    document.getElementById("areaCode").focus();
  },
  areaCode: {
    keyUp: (e)=>{
      //if there are 3 characters in the field
      if(e.currentTarget.value.length >= 3){
        //switch the focus to the next input box
        e.currentTarget.nextSibling.focus();
      }
    },
    keyDown: (e) =>{
      //if there are 3 characters in the field and the key pressed is not the delete key
      if(e.currentTarget.value.length >= 3 && event.keyCode !== 8){
        //do not allow any more characters to be entered
         if (e.preventDefault) {e.preventDefault();}
         else{e.returnValue = false;}//IE specific event cancel
      }
    }
  },
  centralOffice: {
    keyUp: (e)=>{
      //if there are 3 characters in the field
      if(e.currentTarget.value.length >= 3){
        //switch the focus to the next input box
        e.currentTarget.nextSibling.focus();
      }
      //if there are 0 characters in the field and the key pressed is the delete btn
      else if(e.currentTarget.value.length <= 0 && event.keyCode == 8){
        //switch the focus to the previous input box
        e.currentTarget.previousSibling.focus();
      }
    },
    keyDown: (e) =>{
      ///if there are 3 characters in the field and the key pressed is not the delete key
      if(e.currentTarget.value.length >= 3 && event.keyCode !== 8) {
        //do not allow any more characters to be entered
         if (e.preventDefault) {e.preventDefault();}
         else{e.returnValue = false;}//IE specific event cancel
      }
    }
  },
  lineNumber: {
    keyUp: (e)=>{
      //if there are 0 characters in the field and the key pressed is the delete btn
      if(e.currentTarget.value.length <= 0 && event.keyCode == 8){
        //switch the focus to the previous input box
        e.currentTarget.previousSibling.focus();
      }
    },
    keyDown: (e) =>{
      //if there are 4 characters in the field and the key pressed is not the delete btn
      if (e.currentTarget.value.length >= 4 && event.keyCode !== 8){
        //do not allow any more characters to be entered
         if (e.preventDefault) {e.preventDefault();}
         else{e.returnValue = false;}//IE specific event cancel
      }
    }
  }
}

//popup component data
var popup = {
  text: "",
  animationEnd: (e) =>{
    //remove the fadeInFadeOut class when the animation is finished
    e.currentTarget.classList.remove("fadeInFadeOut");
  }
}

//home screen view functions and data
var home = {
  //flag for if the view is currently in the process of refreshing
  refreshSwiping: false,
  //event for before the view is remove when navigating away
  beforeRemove: () =>{
    //wait 300 ms to allow time for the nav animation to finish
    return new Promise((resolve) => {
        setTimeout(() => {resolve();}, 300);
    })
  },
  //when the home screen view is created and added to the dom
  //showPopup => flag for if the popup should show when the view is loaded
  created: (showPopup) =>{
    //enable the header button click events
    document.querySelector(".recovery").style.pointerEvents = "auto";
    document.querySelector(".add").style.pointerEvents = "auto";
    //set up the swipe refresh event handler
    home.refreshSwipe();
    //if the popup is flagged as true show it
    if(showPopup){
      document.getElementById("popup").classList.add("fadeInFadeOut");
    }
  },
  //refresh swipe event
  refreshSwipe: () =>{
    //the Y postion of the user's finger when dragging starts
    var startY;
    //The starting Y position of the user's finger when the page container is at the top of its scroll
    var topStartY = 0;
    //how many px the user has swiped down since reaching the top of the container
    var deltaY = 0;
    //the part of the screen listening to the swipe events
    var appScreen =  document.querySelector("homeScreen .pageContent");
    //the loading icon gif
    var loadingIcon = document.querySelector(".miniLoading");
    //how many px the loading icon must be dragged before the refresh is activated
    var buffer = screen.height * .25;
    //refresh swipe touch start event handler
    appScreen.addEventListener('touchstart', (e)=>{
      //set the startY
      startY = e.touches[0].pageY;
      //set the loading icon y position
      loadingIcon.style.top = "-45px";
      //remove the slide up animation from the icon
      loadingIcon.classList.remove("slideUp");
    }, {passive: true});
    //refresh swipe touch move event handler
    appScreen.addEventListener('touchmove', e => {
      //ignore this swipe if the user is currently swiping to delete a reminder
      if(reminders.reminderSwipe.swiping){return;}
      //set the refresh swiping to true so that a reminder swipe cannot be initiated
      home.refreshSwiping = true;
      //y position of the user's finger during the touch drag
      var y = e.touches[0].pageY;
      //if the page container is at the top of its scroll and the user is swiping down
      if (appScreen.scrollTop === 0 && y > startY) {
        //set the overflow to clip so that the page cannot scroll during the swipe
        appScreen.style.overflowY = "clip";
        //set the starting top Y if it has not already been set
        if(topStartY <= 0){topStartY = y;}
        //calculate how far down the user has dragged
        deltaY = y - topStartY;
        //if the delta y is less then the buffer amount move the loading icon by the delta amount
        if(deltaY <= buffer){loadingIcon.style.top = (-45 + deltaY)+"px";}
    }
  }, {passive: false});
    //refresh swipe touch end event handler
    appScreen.addEventListener('touchend', e => {
      //the refresh swipe is no longer in process
      home.refreshSwiping = false;
      //reset the top start y to 0
      topStartY = 0;
      //animate the loading icon back to the top of the screen
      loadingIcon.classList.add("slideUp");
      //reset the overflow y to allow for page scrolling
      appScreen.style.overflowY = "scroll";
      //if the loading icon was dragged to the buffer point route to the loading screen
      if(deltaY >= buffer){m.route.set('/loading');}
    },{passive: true});
  }
}

//loading screen view functions and data
var loading = {
  //event for when the loading screen initalizes
  //vnode => mithril vitual dom node
  init: async (vnode)=>{
    //flag for if the popup should show on the next screen
    var showPopup = false;
    //initial load when the app is first opened
    if(vnode.attrs.load == "initial"){
      try{
        //register the service worker
        await loading.registerWorker();
        //initalize the database user
        await pouchDB.initUser();
        //check if the user has a phone number already saved
        recovery.savedPhoneNumber = await database.checkUserPhoneNumber();
        //set up the app opening event handler
        loading.appOpen();
        //get the user's token saved in the db
        var push = await database.checkUserSubscription();
        //register the browser to the pushy subscription
        var token = await Pushy.register({ appId: '61d7697dddfb89f56696d67b' });
        //if the push token in the db is different from the one registered in the browser
        if(push.sub !== token){
          //update the token saved in the db
          await database.saveUserSubscription(token);
        }
      }
      catch (error){
        //set the popup text to the error and show it
        popup.text = error
        showPopup = true;
      }
    }
    //load after saving a new phone number
    else if(vnode.attrs.load == "phone"){
      try{
        await database.saveUserPhoneNumber(vnode.attrs.phoneNumber);
        //we just saved a new number so set to true
        recovery.savedPhoneNumber = true;
        //set the popup text and show it
        popup.text = "Recovery phone number saved!";
        showPopup = true;
      }
      catch (error){
        //set the popup text to the error and show it
        popup.text = error
        showPopup = true;
      }
    }
    //load after user data recovery
    else if(vnode.attrs.load == "recovery"){
      try{
        await pouchDB.recoverUser(database.user_id);
        //if recovery was succesful then the user had a phone number
        recovery.savedPhoneNumber = true;
        popup.text = "Data was successfully recovered!";
        showPopup = true;
      }
      catch (error){
        popup.text = error;
        showPopup = true;
      }
    }
    // load after a new reminder is added
    else if(vnode.attrs.load == "new"){
      try{
        //add the reminder to the db
        await database.saveReminder(vnode.attrs.reminder);
        popup.text = "New reminder added!";
        showPopup = true;
      }
      catch (error){
        popup.text = error;
        showPopup = true;
      }
    }
    //loading screen always transitions to the home screen
    try{
      //sort the reminders in the db
      await reminders.sort();
      //wait at least a second before transitioning screens
      setTimeout(function(){ m.route.set('/home', {showPopup: showPopup}); }, 1000);
    }
    catch (error){
      //if there is an error add it to the popup box
      popup.text = popup.text !== "" ? popup.text + "\n" + error : error;
      showPopup = true;
      //if there is an error during loading just go to the home screen
      setTimeout(function(){ m.route.set('/home', {showPopup: showPopup}); }, 1000);
    }
  },
  created: ()=>{
    //disable the header buttons while the page loads
    document.querySelector(".recovery").style.pointerEvents = "none";
    document.querySelector(".add").style.pointerEvents = "none";
  },
  //on visibility change event
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
  //registraion after the service worker has been registered
  swRegistration: null,
  //registers the service worker
  registerWorker: async () =>{
    if ('serviceWorker' in navigator) {
      var registration = await navigator.serviceWorker.register('service-worker.js');
      loading.swRegistration = registration;
      console.log("service worker registered");
      //if the registration has been changed update it
      loading.swRegistration.update();

    }
    else{
      console.log("Service Workers not supported");
    }
  }
}

//add screen view functions and data
var add = {
  beforeRemove: (vnode) =>{
    //add the navigation out animation
    vnode.dom.classList.add("navOutRight");
    //defer removing the view until after the navDown animation finishes
    return new Promise((resolve)=> {
        vnode.dom.addEventListener("animationend", resolve);
    })
  },
  created: () =>{
    //focus the title input on page load
    document.querySelectorAll(".titleInput")[0].focus();
    //initalize the date and time pickers
    flatpickr("#dateOpen",{
      defaultDate: moment().format("YYYY-MM-DD")
    });
    flatpickr("#timeOpen",{
      enableTime: true,
      noCalendar: true,
      dateFormat: "h:i K",
      defaultDate: moment().format("hh:mm A")
    });
  },
  exitClick: () =>{
    m.route.set('/home', {showPopup: false});
  },
  addClick: (e) =>{
    //disable this click event to prevent double clicks
    e.currentTarget.style.pointerEvents = "none";
    try{
      //get the data needed for a reminder
      var newReminder = reminders.gatherReminderData();
      //route to the loading screen
      m.route.set('/loading', {load: "new", reminder: newReminder});
    }
    catch(error){
      popup.text = error;
      m.redraw();
      document.getElementById("popup").classList.add("fadeInFadeOut");
    }
    e.currentTarget.style.pointerEvents = "auto";
  },
  switchClick: () =>{
    if(document.querySelectorAll("input.noTime")[0].checked){
      document.querySelectorAll("[type='time']")[0].classList.add("hidden");
    }
    else{
      document.querySelectorAll("[type='time']")[0].classList.remove("hidden");
    }
  }
}

var phone = {
  beforeRemove: (vnode)=>{
    vnode.dom.classList.add("navOutLeft");
    //defer removing the view until after the navDown animation finishes
    return new Promise(function(resolve) {
        vnode.dom.addEventListener("animationend", resolve)
    })
  },
  exitClick: () =>{
    m.route.set('/home', {showPopup: false});
  },
  addClick: (e)=>{
    try{
      e.currentTarget.children[0].classList.add("pulse");
      //get the phone number digits from the input fields
      var areaCode = document.getElementById("areaCode").value;
      var centralOffice = document.getElementById("centralOffice").value;
      var lineNumber = document.getElementById("lineNumber").value;
      //combine the numbers into one phone number
      var phoneNumber = "+1"+areaCode+centralOffice+lineNumber;
      //if the number contains less then the full number of digits of a value phone number throw an error
      if(phoneNumber.length < 12){
        throw "Not a valid phone number";
      }
      //if there is no error with the number route to the loading screen
      m.route.set('/loading', {load: "phone",phoneNumber:phoneNumber});
    }
    catch (error){
      popup.text = error;
      m.redraw();
      document.getElementById("popup").classList.add("fadeInFadeOut");
    }
  },
  skipClick: (e)=>{
    e.currentTarget.children[0].classList.add("pulse");
    m.route.set('/recovery');
  },
  animationEnd: (e)=>{
    e.target.classList.remove("pulse");
  }
}

var recovery = {
  savedPhoneNumber: null,
  phoneNumber: null,
  beforeRemove: (vnode)=>{
    vnode.dom.classList.add("navOutLeft");
    //defer removing the view until after the navDown animation finishes
    return new Promise(function(resolve) {
        vnode.dom.addEventListener("animationend", resolve)
    })
  },
  exitClick: ()=>{
    m.route.set('/home', {showPopup: false});
  },
  requestClick: async (e)=>{
    e.currentTarget.children[0].classList.add("pulse");
    //disable this click event to prevent double clicks
    e.currentTarget.style.pointerEvents = "none";
    try{
      //get the phone number digits from the input fields
      var areaCode = document.getElementById("areaCode").value;
      var centralOffice = document.getElementById("centralOffice").value;
      var lineNumber = document.getElementById("lineNumber").value;
      //combine the numbers into one phone number
      var phoneNumber = "+1"+areaCode+centralOffice+lineNumber;
      //if the number contains less then the full number of digits of a value phone number throw an error
      if(phoneNumber.length < 12){
        throw "Not a valid phone number";
      }
      //set the recovery phone number to the number in the input fields. this is used for part 2
      recovery.phoneNumber = phoneNumber;
      //request a verification code
      await database.requestVerification(phoneNumber);
      //show part two, hide part 1
      document.getElementById("partOne").classList.add("hidden");
      document.getElementById("partTwo").classList.remove("hidden");
    }
    catch (error){
      popup.text = error;
      m.redraw();
      document.getElementById("popup").classList.add("fadeInFadeOut");
    }
    e.target.style.pointerEvents = "auto";
  },
  confirmClick: async (e)=>{
    e.currentTarget.children[0].classList.add("pulse");
    //disable this click event to prevent double clicks
    e.currentTarget.style.pointerEvents = "none";
    try{
      //get the code in the input field
      var code = document.getElementById("codeInput").value;
      //use the code and the phone number from part 1 to complete the verification process
      var user_id = await database.checkVerification(recovery.phoneNumber,code);
      //update the local user_id variable with the returned user_id
      database.user_id = user_id;
      //route to the loading screen
      m.route.set('/loading', {load: "recovery"});
    }
    catch (error){
      popup.text = error;
      m.redraw();
      document.getElementById("popup").classList.add("fadeInFadeOut");
    }
    e.target.style.pointerEvents = "auto";
  },
  animationEnd: (e)=>{
    e.target.classList.remove("pulse");
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


export{home,loading,add,phone,recovery,popup,header,reminders,repeatBtn,phoneInput};
