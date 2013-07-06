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
    socket.set('userId', 'host');
    socket.join(data.name);
    if(!rooms[data.name]){
      //full update of state including ody and request fresh file (pick first file arbitrarily)
      rooms[data.name] = data;

      // socket.emit('changeFile', data.files[0]);
      rooms[data.name].files = [];
      // rooms[data.name].currentFile = data.files[0];
      rooms[data.name].currentFile = null;
      rooms[data.name].hostSocket = socket;

      console.log('new room created:' + data.name);
    }else{
      //just update the files
      // rooms[data.name].files = data.files;
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

  //watch operations from host
  socket.on('fileAdded', function (file) {
    socket.get('room', function (err, room) {
      if(!err && room!="" && room !=null){
        if(rooms[room].files.indexOf(file) === -1){
          rooms[room].files.push(file);
          io.sockets.in(room).emit('fileAdded', file);          
        }
      }
    });
  });  

  socket.on('fileDeleted', function (file) {
    socket.get('room', function (err, room) {
      if(!err && room!="" && room !=null){
        if(rooms[room].files.indexOf(file) > -1){
          rooms[room].files.splice(rooms[room].files.indexOf(file), 1);
          io.sockets.in(room).emit('fileDeleted', file);          
        }
      }
    });
  });  

  socket.on('fileChanged', function (file) {
    socket.get('room', function (err, room) {
      if(!err && room!="" && room !=null){
        if(rooms[room].files.indexOf(file) > -1){
          io.sockets.in(room).emit('fileChanged', file);          
        }
      }
    });
  });  

  //client --> server --> client (client joins a particular room and gets room data refreshed)
  socket.on('join', function (data) {
    console.log('recieved Join request room' + data.room);
    if(rooms[data.room]){
      //set up the socket properties
      socket.join(data.room);
      socket.set('room', data.room);
      var userId = (data.userId)?data.userId:'hacker' + Math.floor(Math.random() * 9999999999).toString();
      socket.set('userId', userId);

      //tell the socket about the room state
      var roomState = rooms[data.room];
      roomState.files.forEach(function(file){
        socket.emit('fileAdded', file)
      });
      socket.emit('changeFile', roomState.currentFile);
      socket.emit('refreshData', roomState.body);

      //tell this socket about all of the users (including itself)
      var clients = io.sockets.clients(data.room);
      clients.forEach(function(client){
        client.get('userId', function(err, clientUserId){
          if(clientUserId){
            socket.emit('newUser', {userId:clientUserId, isYou:(client===socket)?true:false});
          }
        });
      });      

      //now tell all of the other sockets about the new user
      socket.broadcast.to(data.room).emit('newUser', {userId:userId, isYou:false});
    }else{
      socket.emit('updatechat','hackify','room ' + data.room + ' does not exist')
    }
  });

  //client --> server (client leaves a particular room)
  socket.on('leave', function (data) {
    socket.leave(data.room);
    socket.set('room', null);
    //todo - tell everybody else in room that user is gone.. also wire up same to socket disconnect...?? both??
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
        socket.get('userId', function(err, userId){
          console.log('sendchat:' + data);
          io.sockets.in(room).emit('updatechat',userId, data);          
      })
      }
    });
  });

  socket.on('changeUserId', function (newUserId) {
    console.log('newUserId:' + newUserId);
    socket.get('room', function (err, room) {
      if(!err && room!="" && room !=null){
        socket.get('userId', function(err, userId){
          socket.set('userId', newUserId, function(){
            io.sockets.in(room).emit('userIdChanged',userId, newUserId);
            io.sockets.in(room).emit('updatechat', 'hackify', userId + ' changed name to ' + newUserId);              
          });
        
      })
      }
    });
  });

});