var express = require('express');
var app = express();
var server = app.listen(process.env.PORT || 3000,function(){console.log("Listening on port 3000!")});

//redirect to https if not already on https
if(process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https')
      res.redirect(`https://${req.header('host')}${req.url}`)
    else
      next()
  })
}

//serve the assets
app.use('/assets', express.static('assets'));
app.use('/libraries', express.static('libraries'));
app.use('/src', express.static('src'));
app.use('/', express.static('/'));

//serve the html file
app.get("/",function(req,res){
    res.sendFile(__dirname + '/index.html');
});
