const Long = require('long');

const BITMASKS = new Uint32Array(33);

for (let i = 0; i < 32; i++) {
    BITMASKS[i] = (1 << i) - 1;
}

BITMASKS[BITMASKS.length - 1] = -1;

class PacketBuffer {
    constructor(id, data) {
        this.id = id;
        this.buffer = data;

        this.offset = 0;
        this.bitOffset = 0;
    }

    remaining() {
        return this.buffer.length - this.offset;
    }

    writeByte(i) {
        this.buffer[this.offset] = i;
        this.offset += 1;

        return this;
    }

    writeBytes(bytes) {
        for (const i of bytes) {
            this.writeByte(i);
        }

        return this;
    }

    writeString(string) {
        for (let i = 0; i < string.length; i += 1) {
            this.writeByte(string.charCodeAt(i));
        }
    }

    writeShort(i) {
        this.buffer[this.offset++] = (i >> 8) & 0xff;
        this.buffer[this.offset++] = i & 0xff;

        return this;
    }

    writeInt(i) {
        this.buffer[this.offset++] = (i >> 24) & 0xff;
        this.buffer[this.offset++] = (i >> 16) & 0xff;
        this.buffer[this.offset++] = (i >> 8) & 0xff;
        this.buffer[this.offset++] = i & 0xff;

        return this;
    }

    writeLong(i) {
        this.writeInt(i.shiftRight(32).toInt());
        this.writeInt(i.toInt());

        return this;
    }

    // used for inventory, bank etc.
    writeStackInt(i) {
        if (i < 128) {
            this.buffer[this.offset++] = i & 0xff;
        } else {
            this.buffer[this.offset++] = ((i >> 24) + 128) & 0xff;
            this.buffer[this.offset++] = (i >> 16) & 0xff;
            this.buffer[this.offset++] = (i >> 8) & 0xff;
            this.buffer[this.offset++] = i & 0xff;
        }

        return this;
    }

    writeBits(value, bits) {
        let byteOffset = this.bitOffset >> 3;
        let bitOffset = 8 - (this.bitOffset & 7);

        this.bitOffset += bits;

        for (; bits > bitOffset; bitOffset = 8) {
            this.buffer[byteOffset] &= ~BITMASKS[bitOffset];
            this.buffer[byteOffset++] |=
                (value >> (bits - bitOffset)) & BITMASKS[bitOffset];

            bits -= bitOffset;
        }

        if (bits === bitOffset) {
            this.buffer[byteOffset] &= ~BITMASKS[bitOffset];
            this.buffer[byteOffset] |= value & BITMASKS[bitOffset];
        } else {
            this.buffer[byteOffset] &= ~(BITMASKS[bits] << (bitOffset - bits));
            this.buffer[byteOffset] |=
                (value & BITMASKS[bits]) << (bitOffset - bits);
        }

        this.offset = Math.ceil(byteOffset) + 1;

        return this;
    }

    getByte() {
        if (this.offset > this.buffer.length) {
            throw new RangeError(
                `out of packet range (${this.offset} of ${this.buffer.length})`
            );
        }

        return this.buffer[this.offset++];
    }

    getBytes(length) {
        if (!length) {
            length = this.remaining();
        }

        if (this.offset + length > this.buffer.length) {
            throw new RangeError(
                `out of packet range (${this.offset + length} of ` +
                    `${this.buffer.length})`
            );
        }

        const bytes = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;

        return bytes;
    }

    getString(length) {
        const bytes = this.getBytes(length);
        return bytes.toString('ascii');
    }

    getShort() {
        return this.getByte() * 256 + this.getByte();
    }

    getInt() {
        const i =
            ((this.getByte() & 0xff) << 24) +
            ((this.getByte() & 0xff) << 16) +
            ((this.getByte() & 0xff) << 8) +
            (this.getByte() & 0xff);

        return i;
    }

    getStackInt() {
        if ((this.buffer[this.offset] & 0xff) < 128) {
            return this.buffer[this.offset];
        } else {
            return (
                (((this.getByte() & 0xff) - 128) << 24) +
                ((this.getByte() & 0xff) << 16) +
                ((this.getByte() & 0xff) << 8) +
                (this.getByte() & 0xff)
            );
        }
    }

    getLong() {
        return Long.fromInt(this.getInt() & 0xffffffff)
            .shiftLeft(32)
            .add(new Long(this.getInt() & 0xffffffff));
    }

    build() {
        const length = this.offset;
        const header = Buffer.alloc(3);

        if (length >= 160) {
            header[0] = 160 + (length + 1) / 256;
            header[1] = (length + 1) & 0xff;
            header[2] = this.id;

            return Buffer.concat(
                [header, this.buffer.slice(0, length)],
                3 + length
            );
        } else {
            header[0] = length + 1;

            if (length > 0) {
                header[1] = this.buffer[length - 1];
                header[2] = this.id;

                return Buffer.concat(
                    [header, this.buffer.slice(0, length - 1)],
                    3 + length - 1
                );
            } else {
                header[1] = this.id;

                return header;
            }
        }
    }
}

module.exports = PacketBuffer;
