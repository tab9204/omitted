var cacheName = 'offlineCache-v6';

var contentToCache = [
  './manifest.json'
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
self.addEventListener('pushsubscriptionchange', function(event) {
  var update = async (event) =>{
    var user_id =  await pouchDB.local.get("_local/user");

    var subscription = await self.registration.pushManager.subscribe(event.oldSubscription.options);

    return await database.saveUserSubscription(subscription,user_id);
  }

  event.waitUntil(update());
});*/
