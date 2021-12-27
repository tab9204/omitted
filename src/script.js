import {homeScreen,addScreen,loadingScreen,recoveryScreen,phoneScreen} from './views.js';
import {worker,reminders,events} from './data.js';
import {pouchDB} from './database.js';
import "../libraries/mithril.min.js";

window.onload = async () =>{
  //start the app on the loading screen with the initial load
  m.route.set('/loading', {load: "initial"});

  var root = document.body.children[0];

  m.route(root, "/home",{
    "/home": homeScreen,
    "/loading": loadingScreen,
    "/add": addScreen,
    "/recovery": recoveryScreen,
    "/phone": phoneScreen
  })

}
