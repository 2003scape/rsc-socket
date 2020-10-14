# rsc-socket
encode/decode runescape classic packets. designed to wrap
node [Socket](https://nodejs.org/api/net.html#net_class_net_socket) or
WebSocket ([client](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
or [server](https://www.npmjs.com/package/ws)), similar to how
[json-socket](https://www.npmjs.com/package/json-socket) works.

this module handles encoding/decoding of usernames and chat messages as well,
converting everything to native types.

## install

    $ npm install @2003scape/rsc-socket

## example
```javascript
const RSCSocket = require('./src');
const net = require('net');

net.createServer((socket) => {
    socket = new RSCSocket(socket, true);
    socket.on('error', (err) => console.error(err));

    socket.on('message', (message) => {
        console.log('packet recevied', message);

        if (message.type === 'login') {
            socket.sendMessage({
                type: 'worldInfo',
                index: 0,
                planeWidth: 2304,
                planeHeight: 1776,
                planeIndex: 0
            });
        }
    });
}).listen(43594);
```

## api
### socket = new RSCSocket(net.Socket || WebSocket, isServer = true)
create a new socket wrapper instance.

### socket.send(data)
send a raw data buffer (used in login process).

### socket.sendMessage(message)
send a POJO from to be encoded and written to the socket.

### socket.getIPAddress()
return the IPv4 address as a string.

### socket.close()
terminate or destroy the socket.

### socket.on('message', (message) => {})
received a decoded packet POJO.

## license
Copyright 2020  2003Scape Team

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the
Free Software Foundation, either version 3 of the License, or (at your option)
any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program. If not, see http://www.gnu.org/licenses/.
