/*****app views****/
import {events,reminders,worker} from './data.js';
import {database,pouchDB} from './database.js';
import "../libraries/flatpickr.js";

/************view components*************/

//header component
var header = {
  view: ()=>{
    return m(".header",[
      m("img.miniLoading", {src:"./assets/loading.gif"}),
      m("div", moment().format("ddd, MMM DD YYYY")),
      m("img.add",{class: window.location.hash == "#!/loading" ? "hidden" : "", src:"./assets/plus.png", onclick: async (e) => {
        //add a short vibration when the button is pressed for feedback
        window.navigator.vibrate(5);
        //disable this click event to prevent double clicks
        e.currentTarget.style.pointerEvents = "none";
        try{
          //request notifications permission
          var permission = await worker.requestPermissions();
          //try to subscribe the user to push notifications
          var subscription = await worker.subscribeUser(permission);
          //add the subscription to the db
          await database.saveUserSubscription(subscription,database.user_id);

        }
        catch(error){
          console.log(error);
        }

        window.location = "#!/add";
      }})
    ])
  }
}

//header component
var footer = {
  view: ()=>{
    return m(".footer",[
      m("img.recovery", {src:"./assets/recovery.png", onclick: () => {window.location = "#!/recovery";}})
    ])
  }
}

//reminder component
var reminder = {
  view: (vnode) => {
    return m(".reminder",{
      id:vnode.attrs.reminder.reminder_id,//attach the id of the reminder to the id html attriute
      index: vnode.attrs.index,//the position of the reminder within the reminder array
      //add touch events
      ontouchstart:(e)=>{events.reminderSwipe.startTouch(e)},
      ontouchmove:(e)=>{events.reminderSwipe.moveTouch(e)},
      ontouchend:(e)=>{events.reminderSwipe.endTouch(e)},
      //animation end event for when the slide out animation finishes
      onanimationend: async (e)=>{
        //if the animation that ended was the slide out
        if(e.target.classList.contains("slideOut")){
          //remove the reminder from the dom
         e.currentTarget.remove();
         //remove the reminder from the local reminders array
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
        m(".date",vnode.attrs.reminder.allDay ? moment.unix(vnode.attrs.reminder.timeStamp).utcOffset(vnode.attrs.reminder.offset).format("MM/DD/YYYY") : moment.unix(vnode.attrs.reminder.timeStamp).format("MM/DD/YYYY")),
        m(".time",vnode.attrs.reminder.allDay ? "All day" : moment.unix(vnode.attrs.reminder.timeStamp).format("LT")),
        m(".repeat",vnode.attrs.reminder.repeat),
      ])
    ])
  }
}

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

/**********Views**********/

//home screen
var homeScreen = {
  onbeforeremove: function(vnode) {
    //defer removing the view until after the nav animation finishes
    return new Promise(function(resolve) {
        setTimeout(() => {resolve();}, 300);
    })
  },
  oncreate: () =>{
    //set up the refresh event handler
    events.refreshSwipe();

  },
  view: (vnode)=>{
    return m("homeScreen.contentView",[
      m(header),
      m(".pageContent",[
        m(".pageSection", [
        //  m(".sectionHeader", moment().format("ddd, MMM DD YYYY")),
          m(".reminderList",[
            reminders.all.map((current, i) => {//loop through and display reminders sorted for today
              return m(reminder, {reminder: current, key:current.reminder_id, index: i})
            })
          ])
        ])
      ]),
      m(footer)
    ])
  }
}

//loading screen to show while getting reminders from the db
var loadingScreen = {
  oninit: async () => {
    try{
      //sort the reminders in the db
      await reminders.sort();
      //show the homescreen after the reminders have been sorted
      //wait at least a second before transitioning screens
      setTimeout(function(){ window.location = "#!/home"; }, 1000);

    }
    catch (error){
      //if there is an error sorting the reminders just show the homescreen
      setTimeout(function(){ window.location = "#!/home"; }, 1000);
    }
  },
  view: (vnode)=>{
    return m("loadingScreen.contentView",[
      m(header),
      m(".pageContent",[
        m ("img.loading", {src:"./assets/loading.gif"})
      ])
    ])
  }
}

var addScreen = {//add new reminder screen
  onbeforeremove: function(vnode) {
    vnode.dom.classList.add("navDown");
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
    return m("addScreen.contentView.navUp",[
      m(".pageContent",[
        m(".pageSection", [//navigation section
          m(".navigation",[
            m("img.exit",{src:"./assets/x.png", onclick: ()=>{window.navigator.vibrate(5);  window.location = "#!/home";}}),
            m("img.add",{src:"./assets/plus.png", onclick: async (e) => {
              //disable this click event to prevent double clicks
              e.currentTarget.style.pointerEvents = "none";
              try{
                //get the data needed for a reminder
                var newReminder = reminders.gatherReminderData();
                //add the reminder to the db
                await database.saveReminder(newReminder);

                //add a short vibration when the button is pressed for feedback
                window.navigator.vibrate(5);

                window.location = "#!/loading";
              }
              catch (error){
                alert(error);
                e.currentTarget.style.pointerEvents = "auto";
              }
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
        ])
      ])
    ])
  }
}

//the recovery screen, used to recover lost content with a user id
var recoveryScreen = {
  onbeforeremove: function(vnode) {
    vnode.dom.classList.add("navDown");
    //defer removing the view until after the navDown animation finishes
    return new Promise(function(resolve) {
        vnode.dom.addEventListener("animationend", resolve)
    })
  },
  view: (vnode)=>{
    return m("recoveryScreen.contentView.navUp",[
      m(".pageContent",[
        m(".pageSection", [
          m(".navigation",[
            m("img.exit",{src:"./assets/x.png", onclick: ()=>{window.navigator.vibrate(5);  window.location = "#!/home";}}),
            m("img.add",{src:"./assets/recovery.png", onclick: async (e) => {
              //disable this click event to prevent double clicks
              e.currentTarget.style.pointerEvents = "none";

              //the id supplied in the uid input field
              var input_id = document.querySelector(".uidInput").value;

              try{
                //set the user id to the one one provided in the input field

                //throw an error if the input field is empty
                if(input_id == ""){
                  throw "Please insert a user id to recover";
                }

                await pouchDB.recoverUser(parseInt(input_id));

                window.location = "#!/loading";
              }
              catch (error){
                alert(error);
                e.currentTarget.style.pointerEvents = "auto";
              }
            }})
          ])
        ]),
        m(".pageSection",[
          m(".uidHeader", "User ID"),
          m(".uid", database.user_id)
        ]),
        m(".pageSection",[
          m(".uidHelpText","Save the above User ID to recover reminders if they are deleted. Treat this like a password and keep it secret.")
        ]),
        m(".pageSection",[
          m("input.uidInput",{type: "text", placeholder: "Insert User ID Here"})
        ])
      ])
    ])
  }
}


export{homeScreen,addScreen,loadingScreen, recoveryScreen};
