#!/usr/bin/env node

var fs = require('fs'),
    io = require('socket.io-client'),
    chokidar = require('chokidar'),
    program = require('commander'),
    pjson = require('./package.json');

program
  .version(pjson.version)
  .option('-n, --name [name]', 'Name for the room', Math.floor(Math.random() * 999999).toString())
  .option('-p, --pass [password]', 'Moderator password for the room', Math.floor(Math.random() * 999999).toString())    
  .option('-s, --server [url]', 'Location of the hackify server [http://www.hackify.org]', 'http://www.hackify.org')
  .option('-i, --ignore [regex]', 'Regex of folders to ignore [/(node_modules|.git)/]', '/(node_modules|.git)/')  
  .option('-r, --readonly', 'Read Only')
  .parse(process.argv);

console.log('Creating a hackify room with:');
console.log('room link: %s/rooms/%s', program.server, program.name);
console.log('moderator password: %s', program.pass);
console.log('ignoring folders matching: %s', program.ignore);
if (program.readonly) console.log('room will be read only');

var socket = io.connect(program.server);
var hostedFiles = [];

socket.on('roomCreated', function(){
  console.log('room created successfully');
});

socket.on('error', function(e){
  console.log('Error Occurred:' + e);
});
socket.on('connect_failed', function(e){
  console.log('Connection Failure:' + e);
});

socket.on('connect', function(){
  console.log('connected to server ' + program.server)

  socket.on('changeCurrentFile', function(newFile){
    console.log('changeCurrentFile :' + newFile);
    if(hostedFiles.indexOf(newFile) > -1){
      fs.readFile(newFile, 'utf8', function(err, data) {
        if(err){
          socket.emit('newChatMessage', "error reading file " + newFile + ' ' + err);
        }else{
          socket.emit('refreshData', data, true);
        }
      });
    } else{
      console.log('changeCurrentFile for ' + newFile + ' refused... file is not hosted')
      socket.emit('newChatMessage', 'changeCurrentFile for ' + newFile + ' refused... file is not hosted');       
    }
  });

  socket.on('saveCurrentFile', function(data){
    console.log('saveCurrentFile :' + data.file);
    if(program.readonly){
      console.log('file save for ' + data.file + ' refused... room is read only')
      socket.emit('newChatMessage', 'file save for ' + data.file + ' refused... room is read only');
    }else if(hostedFiles.indexOf(data.file) === -1){
      console.log('file save for ' + data.file + ' refused... file is not hosted')
      socket.emit('newChatMessage', 'file save for ' + data.file + ' refused... file is not hosted');      
    }else{
      fs.writeFile(data.file, data.body, function(err){
        if(err){
          socket.emit('newChatMessage', "error saving file " + data.file + ' ' + err);
        }else{
          socket.emit('newChatMessage', "file save succeeded for file " + data.file);
        }
      });      
    }
  });

  socket.on('disconnect', function(){
    console.log('disconnected from server');
    watcher.close();
    process.exit();
  });  

  socket.emit('createRoom', {
    name: program.name,
    moderatorPass: program.pass,
    readOnly: program.readonly?true:false,
    hostVersion: pjson.version
  });

  //set up watch on folders (Note that this will do an initial scan and emit as well as watch going forward)
  var watcher = chokidar.watch(process.cwd(), {ignored: new RegExp(program.ignore), persistent: true})
    .on('add', function(file, stats) {
      socket.emit('fileAdded', file);
      hostedFiles.push(file);
    })
    .on('change', function(file) {socket.emit('fileChanged', file);})
    .on('unlink', function(file) {
      socket.emit('fileDeleted', file);
      if(hostedFiles.indexOf(file) > -1){
        hostedFiles.splice(hostedFiles.indexOf(file), 1);
      }      
    })
    .on('error', function(error) {console.error('Error happened', error);})

});
