var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    fs = require('fs');
 
app.listen(4000);
 
//simple request handler to serve the client
function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}

//server state
var rooms = {};

io.sockets.on('connection', function (socket) {
  //server --> client (tell the new client about available rooms)
  //host --> server --> host (host sends metadata and a request to create a new room, Host in return gets a request to get fresh file data)
  socket.on('createOrJoinRoom', function (data) {
    socket.set('room', data.name);
    socket.join(data.name);
    if(!rooms[data.name]){
      //full update of state including ody and request fresh file (pick first file arbitrarily)
      rooms[data.name] = data;

      socket.emit('changeFile', data.files[0]);
      rooms[data.name].currentFile = data.files[0];
      rooms[data.name].hostSocket = socket;

      console.log('new room created:' + data.name);
    }else{
      //just update the files
      rooms[data.name].files = data.files;
      rooms[data.name].hostSocket = socket;
      console.log('host reconnected to room' + data.name);
    }   
  });

  //host --> server (send hosted file data to the server for collaborative editing)
  //client --> server (active editor sends a full copy of the modified file data to the server)
  socket.on('refreshData', function (body_) {
    socket.get('room', function (err, room) {
      console.log('new body');
      rooms[room].body = body_;      
    });
  });

  //host --> sever --> client (host sends new file data which is then broadcast to clients)
  socket.on('replaceData', function (body_) {
    socket.get('room', function (err, room) {
      rooms[room].body = body_;
      socket.broadcast.to(room).emit('refreshData', body_);
    });
  });

  //client --> server --> client/host (client requests a change to the file which is passed on to the host so it can load the file and the clients so they can change the file heading)
  socket.on('changeFile', function(newFile){
    socket.get('room', function (err, room) {
      if(!err && room!="" && room !=null){
        rooms[room].currentFile = newFile;
        io.sockets.in(room).emit('changeFile', newFile);
      }
    });    
  });

  socket.on('saveFile', function(){
    socket.get('room', function (err, room) {
      if(!err && room!="" && room !=null){
        rooms[room].hostSocket.emit('saveFile', {file:rooms[room].currentFile, body:rooms[room].body})
      }
    });    
  });

  //client --> server --> client (client joins a particular room and gets room data refreshed)
  socket.on('join', function (data) {
    console.log('recieved Join request room' + data.room);
    if(rooms[data.room]){
      socket.join(data.room);
      socket.set('room', data.room);
      console.log('refreshing socket with room data');
      socket.emit('refreshAll', {body: rooms[data.room].body, files:rooms[data.room].files, currentFile:rooms[data.room].currentFile });
    }else{
      socket.emit('error', 'room does not exist')
    }
  });

  //client --> server (client leaves a particular room)
  socket.on('leave', function (data) {
    socket.leave(data.room);
    socket.set('room', null);
  });

  //client --> server --> clients (active editor sends incremental file data change to the server which then broadcasts it to other clients in the same room)
  socket.on('change', function (op) {
    socket.get('room', function (err, room) {
      if(!err && room!="" && room !=null){
        console.log(op);
        if (op.origin == '+input' || op.origin == 'paste' || op.origin == '+delete') {
          socket.broadcast.to(room).emit('change', op);
        };        
      }
    });
  });

  //client --> server --> clients (chat message from client)
  socket.on('sendchat', function (data) {
    socket.get('room', function (err, room) {
      if(!err && room!="" && room !=null){
        console.log('sendchat:' + data);
        io.sockets.in(room).emit('updatechat','anon', data);
      }
    });
  });
});