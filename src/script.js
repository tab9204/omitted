import {homeScreen,addScreen} from './views.js';
import {registerWorker} from './data.js';

window.onload = async () =>{
  window.location = "#!/home";//start the app on the main screen

  registerWorker();

  var root = document.body.children[0];

  m.route(root, "/home",{
    "/home": homeScreen,
    "/add": addScreen,
  })

}
