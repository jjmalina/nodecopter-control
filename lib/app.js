
/**
 * Module dependencies.
 */

var express = require('express')
  , app = express()
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , server = http.createServer(app)
  , WebSocket = require('ws')
  , wss = new WebSocket.Server({server: server})
  , droneSocket = new WebSocket("ws://localhost:3000/drone")
  , arDrone = require('ar-drone')
  , droneClient  = arDrone.createClient()
  , Parser = require('dronestream/lib/PaVEParser');


// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);


////
//// Parsing client messages
////
function parseControlMessage(controlParams) {
  var action, speed;
  action = controlParams[0];
  if (controlParams.length > 1) {
    speed = parseFloat(controlParams[1]);
  }

  if (action === "takeoff")
    droneClient.takeoff();
  else if (action === "land")
    droneClient.land();
  else if (action === "up")
    droneClient.up(speed);
  else if (action === "down")
    droneClient.down(speed);
  else if (action === "front")
    droneClient.front(speed);
  else if (action === "back")
    droneClient.back(speed);
  else if (action === "left")
    droneClient.left(speed);
  else if (action === "right")
    droneClient.right(speed);
  else if (action === "clockwise")
    droneClient.clockwise(speed);
  else if (action === "counterClockwise")
    droneClient.counterClockwise(speed);
  else if (action === "stop")
    droneClient.stop();
  else if (action === "disableEmergency")
    droneClient.disableEmergency();
}

function parseClientMessage(message) {
  var params = message.split(":");
  if (params[0] === 'CONTROL')
    parseControlMessage(params.slice(1));
  else
    console.log(message);
}


////
//// Streaming
////
var sockets = [];
var options = options || {};
options.timeout = options.timeout || 4000;
function initVideoStream() {
  var tcpVideoStream = new arDrone.Client.PngStream.TcpVideoStream(options),
      p = new Parser();

  console.log("Connecting to drone on %s", options.ip || "192.168.1.1");

  tcpVideoStream.connect(function () {
    tcpVideoStream.pipe(p);
  });

  tcpVideoStream.on('error', function (err) {
    console.log('There was an error: %s', err.message);
    tcpVideoStream.end();
    tcpVideoStream.emit("end");
    initVideoStream();
  });

  p.on('data', function (data) {
    sockets.forEach(function (socket) {
      socket.send(data, {binary: true});
    });
  });
}
initVideoStream();

wss.on('connection', function (socket) {
  console.log("connection made");
  sockets.push(socket);

  socket.on("close", function () {
    console.log("Closing socket");
    sockets = sockets.filter(function (el) {
        return el !== socket;
    });
  });
  socket.on("message", function (message) {
    parseClientMessage(message);
  });

  ////
  //// Stream drone status
  ////
  droneClient.on('navdata', function (data) {
    if (data.demo) {
      sockets.forEach(function (socket) {
        socket.send(JSON.stringify({droneStatus: data.demo}));
      });
    }
  });
});


////
//// Run the server
////
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
