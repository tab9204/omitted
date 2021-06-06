import {homeScreen,addScreen} from './views.js';
import {push,reminders} from './data.js';

window.onload = async () =>{
  window.location = "#!/home";//start the app on the main screen

  //register the service worker
  await push.registerWorker();

  //check for reminder notifications at a regular cadence
  setInterval(async () =>{
    await push.notifyUser();
    await database.cleanDatabase();
    await reminders.sort();
    m.redraw();
  },60000);

  //initalize the database user
  database.initUser();

  var root = document.body.children[0];

  m.route(root, "/home",{
    "/home": homeScreen,
    "/add": addScreen,
  })

}
