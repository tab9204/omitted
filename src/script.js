import {homeScreen,addScreen} from './views.js';
import {push,reminders} from './data.js';

window.onload = async () =>{
  window.location = "#!/home";//start the app on the main screen

  //register the service worker
  await push.registerWorker();

  //initalize the database user
  await database.initUser();

  var root = document.body.children[0];

  m.route(root, "/home",{
    "/home": homeScreen,
    "/add": addScreen,
  })

}
