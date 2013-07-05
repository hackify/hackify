hackify
=======

plug.dj for collaborative development

## Components
* server.js - runs in the cloud, socket, room state, broadcast.
* host.js - runs on the box of the 'host', requests room creation, manages file info and updates
* index.html - served by server.js, simple client, file editing, messaging
* config.json - read by host.js defines room name and folders to host.

## Prerequisites (host/server)
* Node.js

## Running in Dev
Clone repo then..
```
$ npm install
$ node server.js
$ node host.js (seperate terminal)
```
this will effectively 'host' the hackify project in a local instance of hackify (very circular)

using 2 or more browsers, browse to... [http://localhost:4000?room=hackify](http://localhost:4000?room=hackify)


