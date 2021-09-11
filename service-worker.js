var cacheName = 'offlineCache-v10';

var contentToCache = [
  './manifest.json',
  './assets/recovery.png',
  './assets/loading.gif',
  './assets/plus.png',
  './assets/splash-192.png',
  './assets/splash-256.png',
  './assets/splash-384.png',
  './assets/splash-512.png',
  './assets/WorkSans-VariableFont_wght.ttf',
  './assets/x.png',
  './libraries/flatpickr.css',
  './libraries/flatpickr.js',
  './libraries/mithril.min.js',
  './libraries/moment.js',
  './libraries/pouchdb-7.2.1.js'
];


self.addEventListener('install', (event) => {
  console.log('Service Worker Installed');
  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      console.log('Service Worker Caching Files');
      return cache.addAll(contentToCache);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if(key !== cacheName) {
          return caches.delete(key);
        }
      }));
    })
  );
});

self.addEventListener('fetch', (event) => {
  var url = event.request;
  event.respondWith(
    caches.match(event.request).then(function(response) {//respond with cache first
      return response || fetch(event.request);
    })
  );
});

//push notification event
self.addEventListener('push', event => {
  const data = event.data.json();
  console.log("recieved push notification");
  event.waitUntil(self.registration.showNotification(data.title, {body: data.body}));
});


/*
since the turning this script into a module does not play nice we will have to use vanilla js to get the user id and post the new subscription to the server

self.addEventListener('pushsubscriptionchange', function(event) {
  var update = async (event) =>{
    //use vanilla js to do this, do not use pouchdb
    var user_id =  await pouchDB.local.get("_local/user");

    var subscription = await self.registration.pushManager.subscribe(event.oldSubscription.options);

    //directly make the fetch request instead of using the database function
    return await database.saveUserSubscription(subscription,user_id);
  }

  event.waitUntil(update());
});*/
