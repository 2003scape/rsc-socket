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
