/*****app views****/
import {events,reminders,worker,text,recovery} from './data.js';
import {database,pouchDB} from './database.js';
//import "../libraries/flatpickr.js";

/************view components*************/

//header component
var header = {
  view: ()=>{
    return m(".header",[
      m("img.miniLoading", {src:"./assets/loading.gif", alt: "Loading"}),
      m("img.recovery", {src:"./assets/splash-192.png", alt: "Recover reminders", onclick: () => {
        //button switches where it goes based on if the user has already saved their phone number or not
        if(recovery.savedPhoneNumber){
          //if the user saved a phone number send them to the recovery screen
          m.route.set('/recovery');
        }
        else{
          //otherwise route the user to the phone number save screen
          m.route.set('/phone');
        }
      }}),
      m("div", moment().format("ddd MMM DD, YYYY")),
      m("img.add",{src:"./assets/plus.png", alt: "Add reminder", onclick: async (e) => {
        //add a short vibration when the button is pressed for feedback
        window.navigator.vibrate(5);
        //disable this click event to prevent double clicks
        e.currentTarget.style.pointerEvents = "none";
        try{
          //get the user's token saved in the db
          var push = await database.checkUserSubscription();
          //register the browser to the pushy subscription
          var token = await Pushy.register({ appId: '61d7697dddfb89f56696d67b' });
          //if the push token in the db is different from the one registered in the browser
          if(push.sub !== token){
            //update the token saved in the db
            await database.saveUserSubscription(token);
            console.log("User push subcription saved");
          }
          //if the two tokens are the same then no update is needed
          else{
            throw "User push subcription is up to date";
          }
        }
        catch(error){
          console.log(error);
        }
        m.route.set('/add');
      }})
    ])
  }
}


//an individual reminder
var reminder = {
  view: (vnode) => {
    return m(".reminder",{
      id:vnode.attrs.reminder.reminder_id,//attach the id of the reminder to the id html attriute
      index: vnode.attrs.index,//the position of the reminder within the reminder array
      //add touch events
      ontouchstart:(e)=>{events.reminderSwipe.startTouch(e)},
      ontouchmove:(e)=>{events.reminderSwipe.moveTouch(e)},
      ontouchend:(e)=>{events.reminderSwipe.endTouch(e)},
      //animation end event for when the sliding animation finishes
      onanimationend: async (e)=>{
        //if the animation that ended was the slide out
        if(e.target.classList.contains("slideOut")){
          //remove the reminder from the dom
         e.currentTarget.remove();
         //remove the reminder from the reminders array
         var index = parseInt(e.currentTarget.getAttribute("index"));
         reminders.all.splice(parseInt(index),1);
        }
        //if the animation that ended was the slide in
        else if(e.target.classList.contains("slideIn")){
          //set the reminder left style back to the default 0px
          e.currentTarget.style.left = "0px";
          //remove the slideIn class from the reminder
          e.target.classList.remove("slideIn");
        }
      }
    },[
      m(".leftSide",[
        m(".weekday",moment.unix(vnode.attrs.reminder.timeStamp).format("ddd"))
      ]),
      m(".rightSide",[
        m(".title",vnode.attrs.reminder.title),
        m(".date",vnode.attrs.reminder.allDay ? moment.unix(vnode.attrs.reminder.timeStamp).utcOffset(parseInt(vnode.attrs.reminder.offset)).format("MM/DD/YYYY") : moment.unix(vnode.attrs.reminder.timeStamp).format("MM/DD/YYYY")),
        m(".time",{class: vnode.attrs.reminder.allDay ? "hidden": ""},vnode.attrs.reminder.allDay ? "All day" : moment.unix(vnode.attrs.reminder.timeStamp).format("LT")),
        m(".repeat",vnode.attrs.reminder.repeat),
      ])
    ])
  }
}

//the buttons to selection reminder repeat requency
var repeatButtons = {
  view: ()=>{
    return m("div",[
      m(".repeatListTitle", "Repeat"),
      m(".repeatList",[
        m(".btn.repeatItem.selected", {data: "Never", onclick: (e) =>{events.onRepeatClick(e)}},"Never"),
        m(".btn.repeatItem", {data: "d", onclick: (e) =>{events.onRepeatClick(e)}},"Daily"),
        m(".btn.repeatItem", {data: "w", onclick: (e) =>{events.onRepeatClick(e)}},"Weekly"),
        m(".btn.repeatItem", {data: "M", onclick: (e) =>{events.onRepeatClick(e)}},"Monthy"),
        m(".btn.repeatItem", {data: "y", onclick: (e) =>{events.onRepeatClick(e)}},"Yearly"),
      ])
    ])
  }
}

// 3 fields used to input phone numbers
var phoneInput = {
  oncreate: () =>{
    document.getElementById("areaCode").focus();
  },
  view: ()=>{
    return m(".phoneContainer",[
      m("div", "+1"),
      m ("input.phoneInput", {id:"areaCode", maxLength:"3", type:"number", onkeyup: (e)=>{
      //if there are 3 characters in the field
        if(e.currentTarget.value.length >= 3){
          //switch the focus to the next input box
          e.currentTarget.nextSibling.focus();
        }
      }, onkeydown: (e)=>{
      //if there are 3 characters in the field and the key pressed is not the delete key
        if(e.currentTarget.value.length >= 3 && event.keyCode !== 8){
          //do not allow any more characters to be entered
          return false;
        }
      }}),
      m ("input.phoneInput", {id:"centralOffice", maxLength:"3", type:"number", onkeydown: (e)=>{
        ///if there are 3 characters in the field and the key pressed is not the delete key
        if(e.currentTarget.value.length >= 3 && event.keyCode !== 8) {
          //do not allow any more characters to be entered
          return false;
        }
      }, onkeyup: (e)=>{
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
      }}),
      m ("input.phoneInput", {id:"lineNumber", maxLength:"4", type:"number", onkeydown: (e)=>{
        //if there are 4 characters in the field and the key pressed is not the delete btn
        if (e.currentTarget.value.length >= 4 && event.keyCode !== 8){
          //do not allow any more characters to be entered
          return false;
        }
      }, onkeyup: (e) =>{
        //if there are 0 characters in the field and the key pressed is the delete btn
        if(e.currentTarget.value.length <= 0 && event.keyCode == 8){
          //switch the focus to the previous input box
          e.currentTarget.previousSibling.focus();
        }
      }}),
    ])
  }
}

//popup text container, used to show errors and other user messages
var popup = {
  view: (vnode)=>{
    return m("#popup",{onanimationend: (e)=>{
      //remove the fadeInFadeOut class when the animation is finished
      e.currentTarget.classList.remove("fadeInFadeOut");
    }},vnode.attrs.text)
  }
}

/**********Views**********/

//home screen
var homeScreen = {
  onbeforeremove: function(vnode) {
    //defer removing the view until after the nav animation finishes
    return new Promise(function(resolve) {
        setTimeout(() => {resolve();}, 300);
    })
  },
  oncreate: (vnode) =>{
    //enable the header button click events
    document.querySelector(".recovery").style.pointerEvents = "auto";
    document.querySelector(".add").style.pointerEvents = "auto";
    //set up the swipe refresh event handler
    events.refreshSwipe();
    //if the popup is flagged as true show it
    if(vnode.attrs.showPopup){
      document.getElementById("popup").classList.add("fadeInFadeOut");
    }
  },
  view: (vnode)=>{
    return m("homeScreen.contentView",[
      m(header),
      m(".pageContent",[
        m(".pageSection", [
          m(".sectionHeader", "Today"),
          m(".reminderList",[
            reminders.today.map((current, i) => {//loop through and display reminders sorted for today
              return m(reminder, {reminder: current, key:current.reminder_id, index: i})
            })
          ])
        ]),
        m(".pageSection", [
          m(".sectionHeader", "Upcoming"),
          m(".reminderList",[
            reminders.upcoming.map((current, i) => {//loop through and display reminders sorted for upcoming
              return m(reminder, {reminder: current, key:current.reminder_id, index: i})
            })
          ])
        ]),
        m(popup, {text: text.popup})
      ])
    ])
  }
}

//loading screen will perform different actions based on the load attribute
var loadingScreen = {
  oninit: async (vnode) => {
    //flag for if the popup should show on the next screen
    var showPopup = false;
    //the initial page load
    if(vnode.attrs.load == "initial"){
      try{
        //register the service worker
        await worker.registerWorker();
        //initalize the database user
        await pouchDB.initUser();
        //check if the user has a phone number already saved
        recovery.savedPhoneNumber = await database.checkUserPhoneNumber();
        //set up the app opening event handler
        events.appOpen();
      }
      catch (error){
        //set the popup text to the error and show it
        text.popup = error
        showPopup = true;
      }
    }
    //saving a new phone number
    else if(vnode.attrs.load == "phone"){
      try{
        await database.saveUserPhoneNumber(vnode.attrs.phoneNumber);
        //we just saved a new number so set to true
        recovery.savedPhoneNumber = true;
        //set the popup text and show it
        text.popup = "Recovery phone number saved!";
        showPopup = true;
      }
      catch (error){
        //set the popup text to the error and show it
        text.popup = error
        showPopup = true;
      }
    }
    //user data recovery
    else if(vnode.attrs.load == "recovery"){
      try{
        await pouchDB.recoverUser(database.user_id);
        //if recovery was succesful then the user had a phone number
        recovery.savedPhoneNumber = true;
        text.popup = "Data was successfully recovered!";
        showPopup = true;
      }
      catch (error){
        text.popup = error;
        showPopup = true;
      }
    }
    //new reminder added
    else if(vnode.attrs.load == "new"){
      try{
        //add the reminder to the db
        await database.saveReminder(vnode.attrs.reminder);
        text.popup = "New reminder added!";
        showPopup = true;
      }
      catch (error){
        text.popup = error;
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
      text.popup = text.popup !== "" ? text.popup + "\n" + error : error;
      showPopup = true;
      //if there is an error during loading just go to the home screen
      setTimeout(function(){ m.route.set('/home', {showPopup: showPopup}); }, 1000);
    }

  },
  oncreate: () =>{
    //disable the header buttons while the page loads
    document.querySelector(".recovery").style.pointerEvents = "none";
    document.querySelector(".add").style.pointerEvents = "none";
  },
  view: (vnode)=>{
    return m("loadingScreen.contentView",[
      m(header),
      m(".pageContent",[
        m ("img.loading", {src:"./assets/loading.gif", alt: "Loading"})
      ])
    ])
  }
}

var addScreen = {//add new reminder screen
  onbeforeremove: function(vnode) {
    //add the navigation out animation
    vnode.dom.classList.add("navOut");
    //defer removing the view until after the navDown animation finishes
    return new Promise(function(resolve) {
        vnode.dom.addEventListener("animationend", resolve)
    })
  },
  oncreate: ()=>{
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
  view: (vnode)=>{
    return m("addScreen.contentView.navIn",[
      m(".pageContent",[
        m(".pageSection", [//navigation section
          m(".navigation",[
            m("img.exit",{src:"./assets/x.png", alt: "Back", onclick: ()=>{window.navigator.vibrate(5); m.route.set('/home', {showPopup: false});}}),
            m("img.add",{src:"./assets/plus.png", alt: "Add", onclick: async (e) => {
              //disable this click event to prevent double clicks
              e.currentTarget.style.pointerEvents = "none";
              try{
                //add a short vibration when the button is pressed for feedback
                window.navigator.vibrate(5);
                //get the data needed for a reminder
                var newReminder = reminders.gatherReminderData();
                //route to the loading screen
                m.route.set('/loading', {load: "new", reminder: newReminder});
              }
              catch(error){
                text.popup = error;
                m.redraw();
                document.getElementById("popup").classList.add("fadeInFadeOut");
              }
              e.currentTarget.style.pointerEvents = "auto";
            }})
          ])
        ]),
        m(".pageSection", [//title input section
          m("input.titleInput",{type:"text", placeholder: "Remember to..."},"Add new")
        ]),
        m(".pageSection", [//all day switch section
          m(".allDay",[
            m("div","All day reminder"),
            m("label.switch",{onclick: ()=>{
              if(document.querySelectorAll("input.noTime")[0].checked){
                document.querySelectorAll("[type='time']")[0].classList.add("hidden");
              }
              else{
                document.querySelectorAll("[type='time']")[0].classList.remove("hidden");
              }
            }},[
              m("input.noTime", {type: "checkbox"}),
              m("div.slider")
            ])
          ])
        ]),
        m(".pageSection", [//date and time picker section
          m(".dateInput",[
            m("input",{id: "dateOpen"}),
            m("input",{id: "timeOpen"})
          ])
        ]),
        m(".pageSection", [//repeat section
          m(repeatButtons)
        ]),
        m(popup, {text: text.popup})
      ])
    ])
  }
}

//screen to allow users to add their phone number to recover their account
var phoneScreen = {
  onbeforeremove: function(vnode) {
    vnode.dom.classList.add("navOut");
    //defer removing the view until after the navDown animation finishes
    return new Promise(function(resolve) {
        vnode.dom.addEventListener("animationend", resolve)
    })
  },
  view: (vnode)=>{
    return m("phoneScreen.contentView.navIn",[
      m(".pageContent",[
        m(".pageSection", [
          m(".navigation",[
            m("img.exit",{src:"./assets/x.png", alt: "Back", onclick: ()=>{window.navigator.vibrate(5); m.route.set('/home', {showPopup: false});}})
          ])
        ]),
        m(".pageSection", [
          m(".explaination", "Add your phone number below if you want to recieve SMS alerts for your reminders. You can also recover your reminders if they are deleted."),
        ]),
        m(".pageSection", [
          m(phoneInput)
        ]),
        m(".pageSection", [
          m(".btnContainer",[
            m(".genericBtn.phoneBtn",{onclick: ()=>{
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
                //if there is no error with the number route to the loading screen
                m.route.set('/loading', {load: "phone",phoneNumber:phoneNumber});
              }
              catch (error){
                text.popup = error;
                m.redraw();
                document.getElementById("popup").classList.add("fadeInFadeOut");
              }
            }}, "Add number"),
            m(".genericBtn.phoneBtn",{onclick: ()=>{
              //allow the user to skip and go directly to the recovery screen
              m.route.set('/recovery');
            }},"Skip this")
          ]),
        ]),
        m(popup, {text: text.popup})
      ])
    ])
  }
}

//the recovery screen, used to recover lost content with a user id
var recoveryScreen = {
  onbeforeremove: function(vnode) {
    vnode.dom.classList.add("navOut");
    //defer removing the view until after the navDown animation finishes
    return new Promise(function(resolve) {
        vnode.dom.addEventListener("animationend", resolve)
    })
  },
  view: (vnode)=>{
    return m("recoveryScreen.contentView.navIn",[
      m(".pageContent",[
        m(".pageSection", [
          m(".navigation",[
            m("img.exit",{src:"./assets/x.png", alt: "Back", onclick: ()=>{window.navigator.vibrate(5);  m.route.set('/home', {showPopup: false});}})
          ])
        ]),
        m("#partOne", [
          m(".pageSection",[
            m(".explaination","Input your phone number below to get a verification code")
          ]),
          m(".pageSection",[
            m(phoneInput)
          ]),
          m(".pageSection",[
            m(".recoverBtn.genericBtn",{onclick: async (e) => {
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
                text.popup = error;
                m.redraw();
                document.getElementById("popup").classList.add("fadeInFadeOut");
              }
              e.target.style.pointerEvents = "auto";
            }},"Request verification code")
          ])
        ]),
        m("#partTwo.hidden", [
          m(".pageSection",[
            m(".explaination","Input the sms verification code into the field below")
          ]),
          m(".pageSection",[
            m("input#codeInput",{type:"text", placeholder: "Code goes here"})
          ]),
          m(".pageSection",[
            m(".recoverBtn.genericBtn",{onclick: async (e) => {
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
                text.popup = error;
                m.redraw();
                document.getElementById("popup").classList.add("fadeInFadeOut");
              }
              e.target.style.pointerEvents = "auto";
            }},"Confirm verification code")
          ])
        ]),
        m(popup, {text: text.popup})
      ])
    ])
  }
}


export{homeScreen,addScreen,loadingScreen,recoveryScreen,phoneScreen};
