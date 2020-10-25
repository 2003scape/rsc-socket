const PacketBuffer = require('./packet-buffer');
const clientOpcodes = require('./opcodes/client');
const serverDecoders = require('./server/decoders');
const serverEncoders = require('./server/encoders');
const serverOpcodes = require('./opcodes/server');
const { EventEmitter } = require('events');

const SOCKET_METHODS = ['connect', 'destroy', 'end', 'setKeepAlive'];

const BUFFER_SIZE = 5000;

class RSCSocket extends EventEmitter {
    constructor(socket, isServer = true) {
        super();

        this.socket = socket;
        this.isServer = isServer;

        this.isWebSocket = /websocket/i.test(socket.constructor.name);

        this.readPacketData = Buffer.alloc(BUFFER_SIZE);
        this.readSize = 0;

        this.sendPacketData = Buffer.alloc(BUFFER_SIZE);

        if (this.isWebSocket) {
            this.addWebsocketHandlers();
        } else {
            this.addSocketHandlers();
        }

        if (this.isServer) {
            this.decoders = serverDecoders;
            this.encoders = serverEncoders;
            this.decoderTypes = {};

            for (const type of Object.keys(clientOpcodes)) {
                this.decoderTypes[clientOpcodes[type]] = type;
            }

            this.encoderOpcodes = serverOpcodes;
        }
    }

    addWebsocketHandlers() {
        if (process.browser) {
            this.socket.addEventListener('error', (err) => {
                this.emit('error', err);
            });

            this.socket.addEventListener('close', () => this.emit('close'));
            this.socket.addEventListener('open', () => this.emit('connect'));

            this.socket.addEventListener('message', (message) => {
                this.onData(message.data);
            });
        } else {
            this.socket.on('error', (err) => this.emit('error', err));
            this.socket.on('open', () => this.emit('connect'));
            this.socket.on('close', () => this.emit('close'));
            this.socket._socket.on('timeout', () => this.emit('timeout'));
            this.socket.on('message', (data) => this.onData(data));
        }
    }

    addSocketHandlers() {
        this.socket.on('error', (err) => this.emit('error', err));
        this.socket.on('connect', () => this.emit('connect'));
        this.socket.on('close', (hadError) => this.emit('close', hadError));
        this.socket.on('data', (data) => this.onData(data));
        this.socket.on('timeout', () => this.emit('timeout'));

        for (const method of SOCKET_METHODS) {
            this[method] = this.socket[method].bind(this.socket);
        }
    }

    onData(data) {
        if (this.readSize >= this.readPacketData.length) {
            this.emit(
                'error',
                new RangeError('read more than 5K bytes without a packet')
            );
            return;
        }

        data.copy(this.readPacketData, this.readSize);
        this.readSize += data.length;

        this.readPacket();
    }

    // read multiple packets from the readPacketData buffer. if the given length
    // of a packet doesn't match remainder of the buffer, do nothing until next
    // call
    readPacket() {
        // we need at least two bytes: the length and the opcode
        if (this.readSize < 2) {
            return;
        }

        let offset = 0;
        let length = this.readPacketData[offset++];

        if (length >= 160) {
            if (this.readSize < offset + 1) {
                return;
            }

            length = (length - 160) * 256 + this.readPacketData[offset++];
        }

        if (length > 0 && this.readSize - offset >= length) {
            let packetData = this.readPacketData.slice(offset, offset + length);

            offset += length;

            if (length < 160) {
                // the last byte is sent first in this instance
                packetData = Buffer.concat([
                    packetData.slice(1),
                    packetData.slice(0, 1)
                ]);
            }

            const id = packetData[0];
            this.handlePacket(new PacketBuffer(id, packetData.slice(1)));

            if (offset < this.readSize) {
                const leftover = this.readPacketData.slice(
                    offset,
                    this.readSize
                );

                leftover.copy(this.readPacketData, 0);
                this.readPacketData.fill(0, leftover.length);

                this.readPacket();
            }

            this.readSize -= offset;
        }
    }

    // accept packet buffer instance and return a POJO message
    handlePacket(packet) {
        const handler = this.decoderTypes[packet.id];

        if (!handler) {
            this.emit(
                'error',
                new RangeError(`unhandled opcode: ${packet.id}`)
            );

            return;
        }

        if (!this.decoders[handler]) {
            this.emit('error', new RangeError(`no handler for ${handler}`));
            return;
        }

        try {
            const message = {
                type: handler,
                ...this.decoders[handler](packet)
            };

            this.emit('message', message);
        } catch (e) {
            this.emit('error', e);
        }
    }

    send(data) {
        if (this.isWebSocket) {
            this.socket.send(data);
        } else {
            this.socket.write(data);
        }
    }

    // accept a POJO with type and return a built packet buffer instance
    sendMessage(message) {
        const id = this.encoderOpcodes[message.type];

        if (Number.isNaN(id)) {
            this.emit('error', new RangeError(`invalid type: ${message.type}`));
            return;
        }

        const packet = new PacketBuffer(id, this.sendPacketData);

        this.encoders[message.type](packet, message);
        const encoded = packet.build();

        this.send(encoded);

        this.sendPacketData.fill(0, 0, packet.offset);
    }

    getIPAddress() {
        let address;

        if (this.isWebSocket) {
            address = this.socket._socket.remoteAddress;
        } else {
            address = this.socket.remoteAddress;
        }

        if (address === '::1') {
            return '127.0.0.1';
        }

        address = address.split(':');

        return address[address.length - 1];
    }

    setTimeout(ms) {
        if (this.isWebSocket) {
            this.socket._socket.setTimeout(ms);
        } else {
            this.socket.setTimeout(ms);
        }
    }

    close() {
        if (this.isWebSocket) {
            this.socket.terminate();
        } else {
            this.socket.destroy();
        }
    }

    toString() {
        return (
            `[RSCSocket (ip=${this.getIPAddress()}, ` +
            `web=${this.isWebSocket})]`
        );
    }
}

module.exports = RSCSocket;
