import {homeScreen,addScreen,loadingScreen} from './views.js';
import {worker,reminders,events} from './data.js';
import {pouchDB} from './database.js';
import "../libraries/mithril.min.js";

window.onload = async () =>{
  //start the app on the main screen
  window.location = "#!/loading";

  //register the service worker
  await worker.registerWorker();

  //initalize the database user
  await pouchDB.initUser();

  events.appOpen();

  var root = document.body.children[0];

  m.route(root, "/home",{
    "/home": homeScreen,
    "/loading": loadingScreen,
    "/add": addScreen,
  })

}
