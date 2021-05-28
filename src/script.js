import {homeScreen,addScreen} from './views.js';
import {database} from './database.js';

window.onload = async () =>{
  window.location = "#!/home";//start the app on the main screen

  var root = document.body.children[0];

  //initalize the remote reminder db for the user
  await database.initRemote();

  m.route(root, "/home",{
    "/home": homeScreen,
    "/add": addScreen,
  })

}
