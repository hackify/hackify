var fs = require('fs'),
    io = require('socket.io-client'),
    chokidar = require('chokidar');

var config = JSON.parse(fs.readFileSync('config.json'));

var socket = io.connect(config.serverURL);

socket.on('connect', function(){
  console.log('connected to server ' + config.serverURL)

  //server --> host (server requests complete file data for initialisation or when active editor chooses to change current file)
  socket.on('changeFile', function(newFile){
    fs.readFile(newFile, 'utf8', function(err, data) {
      if(err){
        console.log('error reading file ' + newFile + ' ' + err);
      }else{
        socket.emit('replaceData', data)
      }
    });
  });

  socket.on('saveFile', function(data){
    console.log('saveFile :' + JSON.stringify(data));
    fs.writeFile(data.file, data.body, function(err){
      if(err){
        socket.emit('sendchat', "error saving file " + data.file + ' ' + err);
      }else{
        socket.emit('sendchat', "file save succeeded for file " + data.file);
      }
    });
  });

  console.log('config:' + JSON.stringify(config));

  //host --> server (host requests creation of a room)
  socket.emit('createOrJoinRoom', {
    name: config.name
  });

  //set up watch on folders
  chokidar.watch(config.hostFolder, {ignored: new RegExp(config.ignoreRegex), persistent: true})
    .on('add', function(file) {socket.emit('fileAdded', file);})
    .on('change', function(file) {socket.emit('fileChanged', file);})
    .on('unlink', function(file) {socket.emit('fileDeleted', file);})
    .on('error', function(error) {console.error('Error happened', error);})

});
