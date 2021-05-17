/**********Data for rendering app views************/
import {Swiper} from "./swipe.js";
import {database} from './database.js';

//initalize swipe events
var reminderSwipe = new Swiper(database.deleteReminder);

//sets up the reminder repeat buttons
var repeatButtons = {
  selectedRepeat: "Never",//default the selected button to never
  repeats: [//button text and values of the button when selected
    {text: "Never", value: "Never"},
    {text: "Daily", value: "d"},
    {text: "Weekly", value: "w"},
    {text: "Monthy", value: "M"},
    {text: "Yearly", value: "y"}
  ],
  onRepeatClick: function(e){//on click event
    //get all the repeat buttons
    var allRepeatButtons = document.querySelectorAll(".repeatItem");
    //loop through all the buttons
    allRepeatButtons.forEach((item, i) => {
      //remove selected class from each button
      item.classList.remove("selected");
    });
    //add selected class to the clicked button
    e.target.classList.add("selected");
    //update the value of the selected repeat to the buttonclicked
    repeatButtons.selectedRepeat = e.target.attributes.data.value;
  }
}

//gets all reminders from the db and sorts them into today and upcoming reminders
var sortedReminders = {
  today: [],
  upcoming:[],
  sort: ()=>{
    //empty out the arrays
    sortedReminders.today = [];
    sortedReminders.upcoming = [];
    //the unix time right now
    var currentTime = moment().format("X");
    //the unix time that the current day ends at
    var endOfDay = moment().endOf("day").format("X");
    //get all the reminders
    database.allReminders().then((all)=>{
        //loop through all returned reminders
        for(var i = 0; i < all.rows.length; i++){
          //the timestamp of the current reminder
          var reminderTime = all.rows[i].doc.timeStamp;
          //the reminder timestamp is between now and the end of the current day
          if(reminderTime >= currentTime && reminderTime <= endOfDay){
            //add this reminder to todays reminders
            sortedReminders.today.push(all.rows[i].doc);
          }
          //the reminder is sometime after the end of the current day
          else if(reminderTime > endOfDay){
            //add this reminder to upcoming reminders
            sortedReminders.upcoming.push(all.rows[i].doc);
          }
        }
        //sort the arrays based on timestamp in acending order
        sortedReminders.upcoming.sort((a,b) => a.timeStamp - b.timeStamp);
        sortedReminders.today.sort((a,b) => a.timeStamp - b.timeStamp);

        m.redraw();
    });
  }
}

//validates reminder inputs and returns all data needed for reminder
function gatherReminderData(){
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
  var repeat = repeatButtons.selectedRepeat;
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
    time: time
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

//cleans and organizes the db by:
//incrementing any reminders that have a repeat frequency
//deleting old reminders that are no longer in use
function cleanDatabase(){
  //the unix time right now
  var currentTime = moment().format("X");
  //array containing promises for all db actions taken
  var dbActions = [];
  //return a promise that resolves once all db actions have completed
  return new Promise(function(resolve, reject) {
    //get all reminders
    database.allReminders().then((all)=>{
      for(var i = 0; i < all.rows.length; i++){//loop through all returned reminders

        var reminderTime = all.rows[i].doc.timeStamp;//timestamp on the reminder
        var reminderRepeat =  all.rows[i].doc.repeat;//the repeat of the reminder

        //if the reminder has already happened but has a repeat requency
        if(reminderTime <= currentTime && reminderRepeat !== "Never"){
          var id = all.rows[i].doc._id;
          //increment the timestamp, date, and weekday by the repeat frequency and update the reminder in the db
          var newTimestamp = moment.unix(reminderTime).add(1,reminderRepeat).format("X");
          var newWeekDay = moment.unix(newTimestamp).format("ddd");
          var newDate = moment.unix(newTimestamp).format("MM/DD/YYYY");
          //all reminder data is the same except for the timestamp, date, and weekday
          var reminder = {
            title: all.rows[i].doc.title,
            repeat: all.rows[i].doc.repeat,
            allDay: all.rows[i].doc.allDay,
            timeStamp: newTimestamp,
            weekDay: newWeekDay,
            date: newDate,
            time: all.rows[i].doc.time
          }
          dbActions.push(database.updateReminder(id,reminder));
        }
        //otherwise if the reminder is in the past and does not repeat
        else if(reminderTime <= currentTime && reminderRepeat == "Never"){
          //delete the reminder from the db
          dbActions.push(database.deleteReminder(all.rows[i].doc._id))
        }
      }
      //resolve the returned promise once all db actions are complete
      Promise.all(dbActions).then((result) => {
        resolve("All DB actions completed");
      }).catch((error) =>{
        //reject if there was an error with one of the db actions
        reject(error);
      });
    });
  });
}


export{repeatButtons,cleanDatabase,sortedReminders,reminderSwipe,gatherReminderData};
