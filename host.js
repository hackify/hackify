#!/usr/bin/env node

var fs = require('fs'),
    io = require('socket.io-client'),
    chokidar = require('chokidar'),
    program = require('commander');;

program
  .version('0.1.0')
  .option('-n, --name [name]', 'Name for the room', Math.floor(Math.random() * 999999).toString())
  .option('-p, --pass [password]', 'Moderator password for the room', Math.floor(Math.random() * 999999).toString())    
  .option('-s, --server [url]', 'Location of the hackify server [http://www.hackify.org]', 'http://www.hackify.org')
  .option('-i, --ignore [regex]', 'Regex of folders to ignore [/(node_modules|.git)/]', '/(node_modules|.git)/')  
  .option('-r, --readonly', 'Read Only')
  .parse(process.argv);

console.log('Creating a hackify room with:');
console.log('room link: %s?room=%s', program.server, program.name);
console.log('moderator password: %s', program.pass);
console.log('ignoring folders matching: %s', program.ignore);
if (program.readonly) console.log('room will be read only');

var socket = io.connect(program.server);

socket.on('connect', function(){
  console.log('connected to server ' + program.server)

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
    name: program.name,
    moderatorPass: program.pass
  });

  //set up watch on folders (Note that this will do an initial scan and emit as well as watch going forward)
  chokidar.watch(process.cwd(), {ignored: new RegExp(program.ignore), persistent: true})
    .on('add', function(file) {socket.emit('fileAdded', file);})
    .on('change', function(file) {socket.emit('fileChanged', file);})
    .on('unlink', function(file) {socket.emit('fileDeleted', file);})
    .on('error', function(error) {console.error('Error happened', error);})

});
