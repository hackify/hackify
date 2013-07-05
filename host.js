var fs = require('fs'),
    io = require('socket.io-client');

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
  finalFileList = [];
  config.hostFolders.forEach(function(folder){
    var fileList = fs.readdirSync(folder);
    fileList.forEach(function(file){
      if(file){
        var fullFile = folder + '/' + file;
        stat = fs.statSync(fullFile);
        if(!stat.isDirectory()){
          finalFileList.push(fullFile);
        }  
      }
    });
  });
  console.log('serving files:' + JSON.stringify(finalFileList));

  //host --> server (host requests creation of a room)
  socket.emit('createOrJoinRoom', {
    name: config.name,
    files: finalFileList
  });
});
