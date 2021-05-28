/***data and functions to enable push notifications****/
import {database} from './database.js';
//registers the service worker
async function registerWorker(){
  if ('serviceWorker' in navigator) {
    var registration = await navigator.serviceWorker.register('service-worker.js');
    console.log("service worker registered");
    return registration;
  }
  else{
    throw "Service Workers not supported";
  }
}

//requests push  permissions from the user if available
async function requestPushPermissions(){
  if('PushManager' in window){
    var result = await Notification.requestPermission();
    return result;
  }
  else{
    throw "Push not supported";
  }
}

//subscribes the user to push notifications
//registration => the service worker registration
async function subscribeUser(registration){
    var subbed =  await registration.pushManager.getSubscription();
    //subscribe the user if they are not already
    if(!subbed){
      //convert the public key
      var publicKey = urlBase64ToUint8Array("BNG3Ct2Mg4JTx-FQ07EixqiEbQjSeNelTPoLhbVAADy0OFB-XI8oPOwwNTzNThCR4B_BStb-8Z-hWAmSjtE4t_8");
      //subscribe the user to push notifications
      var subscription = await registration.pushManager.subscribe({userVisibleOnly: true,applicationServerKey: publicKey});
      //save the subscription to the user database
      await database.saveSubscription(subscription);

      console.log("User subscribed to push notifications");
    }
    else{
      console.log("Already subscribed");
    }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export{registerWorker,requestPushPermissions,subscribeUser};
