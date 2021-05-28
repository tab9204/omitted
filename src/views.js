/*****app views****/
import {repeatButtons,cleanDatabase,sortedReminders,reminderSwipe,gatherReminderData} from './data.js';
import {database} from './database.js';
import {registerWorker,requestPushPermissions,subscribeUser} from './push.js';

//header component
var header = {
  view: ()=>{
    return m(".header",[
      m("div", "Remind Me"),
      m("img.add",{src:"./assets/plus.png", onclick: async (e) => {
        //disable this click event to prevent double clicks
        e.currentTarget.style.pointerEvents = "none";

        try{
          //register service worker
          var registration = await registerWorker();
          //request permissions to use notifications
          var permission = await requestPushPermissions();
          //subscribe to push notifications
          await subscribeUser(registration);

        }
        catch (error){
          console.log(error);
        }
        window.location = "#!/add";
          //enable the click event
        //e.currentTarget.style.pointerEvents = "auto";
      }})
    ])
  }
}

//reminder component
var reminder = {
  view: (vnode) => {
    return m(".reminder",{
      id:vnode.attrs.reminder._id,//attach the id of the reminder to the id html attriute
      //add touch events
      ontouchstart:(e)=>{reminderSwipe.startTouch(e)},
      ontouchmove:(e)=>{reminderSwipe.moveTouch(e)},
      ontouchend:(e)=>{reminderSwipe.endTouch(e)},
      //animation end event for when the slide out animation finishes
      onanimationend: (e)=>{
        if(e.target.classList.contains("slideOut")){
          e.target.classList.add("hidden");
        }
      }
    },[
      m(".leftSide",[
        m(".weekday",vnode.attrs.reminder.weekDay)
      ]),
      m(".rightSide",[
        m(".title",vnode.attrs.reminder.title),
        m(".date",vnode.attrs.reminder.date),
        m(".time",vnode.attrs.reminder.time),
        m(".repeat",vnode.attrs.reminder.repeat),
      ])
    ])
  }
}

//home screen
var homeScreen = {
  oninit: async () => {
    try{
      //clean up the db before sorting the reminders
      await cleanDatabase();
      //sort the reminders in the db
      await sortedReminders.sort();
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
            sortedReminders.today.map((current) => {//loop through and display reminders sorted for today
              return m(reminder, {reminder: current})
            })
          ])
        ]),
        m(".pageSection", [//upcoming reminders section
          m(".sectionHeader","Upcoming reminders"),
          m(".reminderList",[
            sortedReminders.upcoming.map((current) => {//loop through and dispay reminders sorted for upcoming
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
            m("img.add",{src:"./assets/plus.png", onclick: async () => {
              try{
                //get the data needed for a reminder
                var newReminder = gatherReminderData();
                //add the reminder to the db
                await database.addReminder(newReminder);

                window.location = "#!/home";
              }
              catch (error){
                alert(error);
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
          m(".repeatListTitle", "Repeat"),
          m(".repeatList",repeatButtons.repeats.map((item,i) => {
             return m(i <= 0 ? ".selected.btn.repeatItem" : ".btn.repeatItem",{onclick: (e)=>{repeatButtons.onRepeatClick(e)}, data: item.value},item.text)
          }))
        ])
      ])
    ])
  }
}


export{homeScreen,addScreen};
