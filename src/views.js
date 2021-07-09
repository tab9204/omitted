/*****app views****/
import {events,reminders,push} from './data.js';

/************view components*************/

//header component
var header = {
  view: ()=>{
    return m(".header",[
      m("div", "Remind Me"),
      m("img.add",{src:"./assets/plus.png", onclick: async (e) => {
        //disable this click event to prevent double clicks
        e.currentTarget.style.pointerEvents = "none";
        try{
          //request notifications permission
          var permission = await push.requestPermissions();
          //try to subscribe the user to push notifications
          var subscription = await push.subscribeUser(permission);
          //add the subscription to the db
          await database.saveUserSubscription(subscription);
        }
        catch(error){
          console.log(error);
        }

        window.location = "#!/add";
      }})
    ])
  }
}

//reminder component
var reminder = {
  view: (vnode) => {
    return m(".reminder",{
      id:vnode.attrs.reminder.reminder_id,//attach the id of the reminder to the id html attriute
      //add touch events
      ontouchstart:(e)=>{events.reminderSwipe.startTouch(e)},
      ontouchmove:(e)=>{events.reminderSwipe.moveTouch(e)},
      ontouchend:(e)=>{events.reminderSwipe.endTouch(e)},
      //animation end event for when the slide out animation finishes
      onanimationend: (e)=>{
        if(e.target.classList.contains("slideOut")){
          e.target.classList.add("hidden");
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
  oninit: async () => {
    try{
      //sort the reminders in the db
      await reminders.sort();
      m.redraw();
    }
    catch (error){
      console.log(error);
    }
  },
  view: (vnode)=>{
    return m("homeScreen.contentView",[
      m(header),
      m(".pageContent",[
        m(".pageSection", [//todays reminders section
          m(".sectionHeader","Today's reminders"),
          m(".reminderList",[
            reminders.today.map((current) => {//loop through and display reminders sorted for today
              return m(reminder, {reminder: current})
            })
          ])
        ]),
        m(".pageSection", [//upcoming reminders section
          m(".sectionHeader","Upcoming reminders"),
          m(".reminderList",[
            reminders.upcoming.map((current) => {//loop through and dispay reminders sorted for upcoming
              return m(reminder, {reminder: current})
            })
          ])
        ])
      ])
    ])
  }
}

var addScreen = {//add new reminder screen
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
    return m("addScreen.contentView",[
      m(".pageContent",[
        m(".pageSection", [//navigation section
          m(".navigation",[
            m("img.exit",{src:"./assets/x.png", onclick: ()=>{  window.location = "#!/home";}}),
            m("img.add",{src:"./assets/plus.png", onclick: async (e) => {
              //disable this click event to prevent double clicks
              e.currentTarget.style.pointerEvents = "none";
              try{
                //get the data needed for a reminder
                var newReminder = reminders.gatherReminderData();
                //add the reminder to the db
                await database.saveReminder(newReminder);

                window.location = "#!/home";
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


export{homeScreen,addScreen};
