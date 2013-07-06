var fs = require('fs'),
    io = require('socket.io-client'),
    chokidar = require('chokidar');

var config = JSON.parse(fs.readFileSync('config.json'));
console.log('config:' + JSON.stringify(config));

var moderatorPass = (process.argv.length>=3)?process.argv[2]:'';
console.log('moderatorPass:' + moderatorPass);

var socket = io.connect(config.serverURL);

socket.on('connect', function(){
  console.log('connected to server ' + config.serverURL)

  socket.on('changeCurrentFile', function(newFile){
    console.log('changeCurrentFile :' + newFile);
    fs.readFile(newFile, 'utf8', function(err, data) {
      if(err){
        socket.emit('newChatMessage', "error reading file " + newFile + ' ' + err);
      }else{
        socket.emit('refreshData', data, true);
      }
    });
  });

  socket.on('saveCurrentFile', function(data){
    console.log('saveCurrentFile :' + data.file);
    fs.writeFile(data.file, data.body, function(err){
      if(err){
        socket.emit('newChatMessage', "error saving file " + data.file + ' ' + err);
      }else{
        socket.emit('newChatMessage', "file save succeeded for file " + data.file);
      }
    });
  });  

  socket.emit('createRoom', {
    name: config.name,
    moderatorPass: moderatorPass
  });

  //set up watch on folders (Note that this will do an initial scan and emit as well as watch going forward)
  chokidar.watch(config.hostFolder, {ignored: new RegExp(config.ignoreRegex), persistent: true})
    .on('add', function(file) {socket.emit('fileAdded', file);})
    .on('change', function(file) {socket.emit('fileChanged', file);})
    .on('unlink', function(file) {socket.emit('fileDeleted', file);})
    .on('error', function(error) {console.error('Error happened', error);})

});
