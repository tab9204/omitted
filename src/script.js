import {homeScreen,addScreen,loadingScreen} from './views.js';
import {worker,reminders} from './data.js';

window.onload = async () =>{
  //start the app on the main screen
  window.location = "#!/loading";

  //register the service worker
  await worker.registerWorker();

  //initalize the database user
  await database.initUser();


  var root = document.body.children[0];

  m.route(root, "/home",{
    "/home": homeScreen,
    "/loading": loadingScreen,
    "/add": addScreen,
  })

}
