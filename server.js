 require('dotenv').config({ path: 'keys.env' });

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const webPush = require('web-push');
var fs = require('fs');
var knox = require('knox');
const cron = require('node-cron');

//const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
//const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

//webPush.setVapidDetails('mailto:nimdhiran@gmail.com', publicVapidKey, privateVapidKey);

//aws bucket variables
/*var key = process.env.AWS_ACCESS_KEY_ID;
var secretKey = process.env.AWS_SECRET_ACCESS_KEY;
var bucket = "remind-you";
var headers = {
    'Content-Type': 'application/json',
    'x-amz-acl': 'public-read'
  };
var s3 = knox.createClient({
    key: key,
    secret: secretKey,
    bucket: bucket,
    region: "us-west-2",
});*/

server.listen(process.env.PORT || 3000, () => {
  console.log('Server started');
});

//redirect to https if not already on https
if(process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https')
      res.redirect(`https://${req.header('host')}${req.url}`)
    else
      next()
  })
}

app.use(express.json());
//serve the assets
app.use('/assets', express.static('assets'));
app.use('/libraries', express.static('libraries'));
app.use('/src', express.static('src'));
app.use('/', express.static('/'));

//serve the html file
app.get("/",(req,res) =>{
    res.sendFile(__dirname + '/index.html');
});

app.get("/manifest.json",(req,res) =>{
    res.sendFile(__dirname + '/manifest.json');
});

app.get("/service-worker.js",(req,res) =>{
    res.sendFile(__dirname + '/service-worker.js');
});

app.post('/addUser',(req,res) => {
  const user = req.body;
  console.log(req.body);
  addUser(user).then((result)=>{
    res.send(result);
  });
});

//send a push notification to each user every hour
/*cron.schedule('* * * * * ', async () => {
  console.log("cron running");
  getUserFile().then((jsonFile) =>{
    for(let i = 0; i < jsonFile.length; i++){
      const subscription = jsonFile[i].sub;
      const payload = JSON.stringify({title: 'You have a reminder coming up!'});
      webPush.sendNotification(subscription,payload).catch(error => console.log("error sending the notificaiton"));
    }
  })
});*/


//returns the contents of the json user file
function getUserFile(){
  return new Promise(function(resolve, reject) {
    s3.getFile('/users.json', function(err, res){
      if (err){throw new Error(err);}
      else if(res.statusCode === 200){
        res.on('data', function(chunk){
          console.log(JSON.parse(chunk.toString()));
          resolve(JSON.parse(chunk.toString()));
        });
      }
    });
  });
}
//adds a new user to the json file
function addUser(newUser){
  return new Promise(function(resolve, reject) {
    //get the current memoory file
    getUserFile().then(function(jsonFile){
      //add thew new user to the file
      jsonFile.push(newUser);
       //convert the json file to a string
      var update = JSON.stringify(jsonFile);
      console.log(update);

      var req = s3.put('/users.json', {
          'Content-Length': Buffer.byteLength(update),
          'Content-Type': 'application/json'
      });
      req.on('response', function(res){
        if (200 == res.statusCode) {
          console.log('saved to %s', req.url);
        }
      });
      req.end(update);

      resolve("New user added to file");
    });
  });
}
