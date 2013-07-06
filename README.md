hackify
=======

Like plug.dj for collaborative development

## Hacker Story
You are hacking away on your laptop, listening to music, you are smashing it, if only you could share this experience...
You spin up a terminal... 
```
$ node host.js
```
BAM! you have hosted a room, a collaborative coding space... No setup, No logins, Your code, on Your machine.
You send the room link to your code bro's.... http://hackify.org?room=myAwesomeProject
They all hit the link... BAM! your all coding together
You chat, you code, you listen to the same music, your coding awesomeness is now a shared experience.
Congratulations you've been Hackified.

## Components
* server.js - runs in the cloud, socket, room state, broadcast.
* host.js - runs on the box of the 'host', requests room creation, manages file info and updates
* index.html - served by server.js, simple client, file editing, messaging
* config.json - read by host.js defines room name and folders to host and ignore. (yeah ok there is a tiny bit of setup, quit whining)

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


