/*****app views****/
import {repeatButtons,cleanDatabase,sortedReminders,reminderSwipe,gatherReminderData} from './data.js';
import {database} from './database.js';

//header component
var header = {
  view: ()=>{
    return m(".header",[
      m("div", "Remind Me"),
      m("img.add",{src:"./assets/plus.png", onclick: ()=> {
          window.location = "#!/add";
      }})
    ])
  }
}

//home screen
var homeScreen = {
  oninit: ()=>{
    //clean up the db
    cleanDatabase().then((result) => {
      console.log(result);
      //once the db is cleaned sort the remaining reminders
      sortedReminders.sort();
    }).catch((error) =>{
      console.log(error);
    });
  },
  view: (vnode)=>{
    return m("homeScreen.contentView",[
      m(header),
      m(".pageContent",[
        m(".pageSection", [//todays reminders section
          m(".sectionHeader","Today's reminders"),
          m(".reminderList",[
            sortedReminders.today.map((reminder,i) => {//loop through and display reminders sorted for today
              return m(".reminder",{
                id:reminder._id,//attach the id of the reminder to the id html attriute
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
                  m(".weekday",reminder.weekDay)
                ]),
                m(".rightSide",[
                  m(".title",reminder.title),
                  m(".date",reminder.date),
                  m(".time",reminder.time),
                  m(".repeat",reminder.repeat),
                ])
              ])
            })
          ])
        ]),
        m(".pageSection", [//upcoming reminders section
          m(".sectionHeader","Upcoming reminders"),
          m(".reminderList",[
            sortedReminders.upcoming.map((reminder,i) => {//loop through and dispay reminders sorted for upcoming
              return m(".reminder",{
                id:reminder._id,//attach the id of the reminder to the id html attriute
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
                  m(".weekday",reminder.weekDay)
                ]),
                m(".rightSide",[
                  m(".title",reminder.title),
                  m(".date",reminder.date),
                  m(".time",reminder.time),
                  m(".repeat",reminder.repeat),
                ])
              ])
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
            m("img.add",{src:"./assets/plus.png", onclick: ()=> {
              try{
                //get the data needed for a reminder
                var newReminder = gatherReminderData();
                //add the reminder to the db
                database.addReminder(newReminder).then((result) =>{
                  console.log(result);
                  window.location = "#!/home";
                });
              }
              catch (e){//catch and alert any validation error
                alert(e);
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
