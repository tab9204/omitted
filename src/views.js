/*****app views****/
import {home,loading,add,phone,recovery,popup,header,reminders,repeatBtn,phoneInput} from './data.js';
import {database,pouchDB} from './database.js';

/************view components*************/

//view header
var header_component = {
  view: ()=>{
    return m(".header",[
      m("img.miniLoading", {src:"./assets/loading.gif", alt: "Loading"}),
      m("img.recovery", {src:"./assets/splash-192.png", alt: "Recover reminders", onclick:()=>{header.recoveryBtnClick()}}),
      m("div", moment().format("ddd MMM DD, YYYY")),
      m("img.add",{ src: "./assets/plus.png", alt: "Add reminder", onclick:()=>{header.addBtnClick()}})
    ])
  }
}


//individual reminder that appears on the home screen
var reminder_component = {
  view: (vnode) => {
    return m(".reminder",{
      id:vnode.attrs.reminder.reminder_id,//attach the id of the reminder to the id html attriute
      index: vnode.attrs.index,//the position of the reminder within its reminder array
      //touch events
      ontouchstart:(e)=>{reminders.reminderSwipe.startTouch(e)},
      ontouchmove:(e)=>{reminders.reminderSwipe.moveTouch(e)},
      ontouchend:(e)=>{reminders.reminderSwipe.endTouch(e)},
      //animation end event
      onanimationend:async (e)=>{reminders.animationEnd(e)}
    },[
      m(".leftSide",[
        m(".weekday",moment.unix(vnode.attrs.reminder.timeStamp).format("ddd"))
      ]),
      m(".rightSide",[
        m(".title",vnode.attrs.reminder.title),
        //if the reminder is all day use the utc offset to set the date so that the users current timezone is ignored
        //all other reminders should use the user's current timezone
        m(".date",vnode.attrs.reminder.allDay ? moment.unix(vnode.attrs.reminder.timeStamp).utcOffset(parseInt(vnode.attrs.reminder.offset)).format("MM/DD/YYYY") : moment.unix(vnode.attrs.reminder.timeStamp).format("MM/DD/YYYY")),
        m(".time",{class: vnode.attrs.reminder.allDay ? "hidden": ""},vnode.attrs.reminder.allDay ? "All day" : moment.unix(vnode.attrs.reminder.timeStamp).format("LT")),
        m(".repeat",vnode.attrs.reminder.repeat),
      ])
    ])
  }
}

//the buttons to select reminder repeat requency
var repeatBtn_component = {
  view: ()=>{
    return m("div",[
      m(".repeatListTitle", "Repeat"),
      m(".repeatList",[
        m(".btn.repeatItem.selected", {data: "Never", onclick:(e)=>{repeatBtn.click(e)}},"Never"),
        m(".btn.repeatItem", {data: "d", onclick:(e)=>{repeatBtn.click(e)}},"Daily"),
        m(".btn.repeatItem", {data: "w", onclick:(e)=>{repeatBtn.click(e)}},"Weekly"),
        m(".btn.repeatItem", {data: "M", onclick:(e)=>{repeatBtn.click(e)}},"Monthy"),
        m(".btn.repeatItem", {data: "y", onclick:(e)=>{repeatBtn.click(e)}},"Yearly"),
      ])
    ])
  }
}

//3 input fields used to gather phone numbers
var phoneInput_component = {
  oncreate:()=>{phoneInput.created()},
  view: ()=>{
    return m(".phoneContainer",[
      m("div", "+1"),
      m ("input.phoneInput", {id:"areaCode", maxLength:"3", type:"number",
       onkeyup:(e)=>{phoneInput.areaCode.keyUp(e)},
       onkeydown:(e)=>{phoneInput.areaCode.keyDown(e)}
      }),
      m ("input.phoneInput", {id:"centralOffice", maxLength:"3", type:"number",
      onkeyup:(e)=>{phoneInput.centralOffice.keyUp(e)},
      onkeydown:(e)=>{phoneInput.centralOffice.keyDown(e)}
      }),
      m ("input.phoneInput", {id:"lineNumber", maxLength:"4", type:"number",
        onkeyup:(e) =>{phoneInput.lineNumber.keyUp(e)},
        onkeydown:(e)=>{phoneInput.lineNumber.keyDown(e);}
      }),
    ])
  }
}

//popup text container, used to show errors and other user messages
var popup_component = {
  view: (vnode)=>{
    return m("#popup",{onanimationend: (e)=>{popup.animationEnd(e)}},vnode.attrs.text)
  }
}

/**********Views**********/

//home screen
var homeScreen = {
  onbeforeremove:home.beforeRemove,
  oncreate:(vnode)=>{home.created(vnode.attrs.showPopup)},
  view:(vnode)=>{
    return m("homeScreen.contentView",[
      m(header_component),
      m(".pageContent",[
        m(".pageSection", [
          m(".sectionHeader", "Today"),
          m(".reminderList",[
            reminders.today.map((current, i) => {//loop through and display reminders sorted for today
              return m(reminder_component, {reminder: current, key:current.reminder_id, index: i})
            })
          ])
        ]),
        m(".pageSection", [
          m(".sectionHeader", "Upcoming"),
          m(".reminderList",[
            reminders.upcoming.map((current, i) => {//loop through and display reminders sorted for upcoming
              return m(reminder_component, {reminder: current, key:current.reminder_id, index: i})
            })
          ])
        ]),
        m(popup_component, {text: popup.text})
      ])
    ])
  }
}

//loading screen will perform different actions based on the load attribute
var loadingScreen = {
  oninit:async (vnode)=>{await loading.init(vnode)},
  oncreate:()=>{loading.created()},
  view:(vnode)=>{
    return m("loadingScreen.contentView",[
      m(header_component),
      m(".pageContent",[
        m ("img.loading", {src:"./assets/loading.gif", alt: "Loading"})
      ])
    ])
  }
}

var addScreen = {//add new reminder screen
  onbeforeremove:add.beforeRemove,
  oncreate:add.created,
  view:(vnode)=>{
    return m("addScreen.contentView.navInRight",[
      m(".pageContent",[
        m(".pageSection", [//navigation section
          m(".navigation",[
            m("img.exit",{src:"./assets/x.png", alt: "Back", onclick:add.exitClick}),
            m("img.add",{src:"./assets/plus.png", alt: "Add", onclick:add.addClick})
          ])
        ]),
        m(".pageSection", [//title input section
          m("input.titleInput",{type:"text", placeholder: "Remember to..."},"Add new")
        ]),
        m(".pageSection", [//all day switch section
          m(".allDay",[
            m("div","All day reminder"),
            m("label.switch",{onclick:()=>{add.switchClick()}},
            [
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
          m(repeatBtn_component)
        ]),
        m(popup_component, {text: popup.text})
      ])
    ])
  }
}

//screen to allow users to add their phone number to recover their account
var phoneScreen = {
  onbeforeremove:phone.beforeRemove,
  view: (vnode)=>{
    return m("phoneScreen.contentView.navInLeft",[
      m(".pageContent",[
        m(".pageSection", [
          m(".navigation",[
            m("img.exit",{src:"./assets/x.png", alt: "Back", onclick:()=>{phone.exitClick()}})
          ])
        ]),
        m(".pageSection", [
          m(".explaination", "Add your phone number below if you want to recieve SMS alerts for your timed reminders. You can also recover your reminders if they are deleted."),
        ]),
        m(".pageSection", [
          m(phoneInput_component)
        ]),
        m(".pageSection", [
          m(".btnContainer",[
            m(".genericBtn.phoneBtn",{onclick: (e)=>{phone.addClick(e)}}, [
              m(".btnHighlight",{onanimationend: (e)=>{phone.animationEnd(e)}},""),
              m(".phoneBtnText","Add number")
            ]),
            m(".genericBtn.phoneBtn",{onclick: (e)=>{phone.skipClick(e)}}, [
              m(".btnHighlight",{onanimationend: (e)=>{phone.animationEnd(e)}},""),
              m(".phoneBtnText","Skip this")
            ]),
          ]),
        ]),
        m(popup_component, {text: popup.text})
      ])
    ])
  }
}

//the recovery screen, used to recover lost content with a user id
var recoveryScreen = {
  onbeforeremove: recovery.beforeRemove,
  view: (vnode)=>{
    return m("recoveryScreen.contentView.navInLeft",[
      m(".pageContent",[
        m(".pageSection", [
          m(".navigation",[
            m("img.exit",{src:"./assets/x.png", alt: "Back", onclick:()=>{recovery.exitClick()}})
          ])
        ]),
        m("#partOne", [
          m(".pageSection",[
            m(".explaination","Input your phone number below to get a verification code")
          ]),
          m(".pageSection",[
            m(phoneInput_component)
          ]),
          m(".pageSection",[
            m(".genericBtn.recoverBtn",{onclick: (e)=>{recovery.requestClick(e)}}, [
              m(".btnHighlight",{onanimationend: (e)=>{recovery.animationEnd(e)}},""),
              m(".recoverBtnText","Request verification code")
            ])
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
            m(".genericBtn.recoverBtn",{onclick: (e)=>{recovery.confirmClick(e)}}, [
              m(".btnHighlight",{onanimationend: (e)=>{recovery.animationEnd(e)}},""),
              m(".recoverBtnText","Confirm verification code")
            ])
          ])
        ]),
        m(popup_component, {text: popup.text})
      ])
    ])
  }
}


export{homeScreen,addScreen,loadingScreen,recoveryScreen,phoneScreen};
