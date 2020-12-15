const { encodeMessage } = require('../chat-message');
const { encodeUsername } = require('../username');

const MAGIC_BANK_DEPOSIT = 0x87654321;
const MAGIC_BANK_WITHDRAW = 0x12345678;

const DUEL_SETTINGS = ['retreat', 'magic', 'prayer', 'weapons'];
const GAME_SETTINGS = {
    0: 'cameraAuto',
    2: 'oneMouseButton',
    3: 'soundOn'
};

function writeEncodedUsername(packet, { username }) {
    packet.writeLong(encodeUsername(username));
}

function writeIndexShort(packet, { index }) {
    packet.writeShort(index);
}

function writeCoords(packet, { x, y }) {
    packet.writeShort(x).writeShort(y);
}

function writeTransactionItemUpdate(packet, { items }) {
    packet.writeByte(items.length);

    for (const { id, amount } of items) {
        packet.writeShort(id).writeShort(amount);
    }
}

function getWalk(packet) {
    const { x: targetX, y: targetY } = getCoords(packet);

    const steps = [];
    const stepsLength = Math.floor(packet.remaining() / 2);

    for (let i = 0; i < stepsLength; i += 1) {
        const deltaX = packet.getByte() << 24 >> 24;
        const deltaY = packet.getByte() << 24 >> 24;

        steps.push({ deltaX, deltaY });
    }

    return { targetX, targetY, steps };
}

const encoders = {
    appearance(packet, message) {
        packet
            .writeByte(message.headSprite + 1)
            .writeByte(message.bodySprite + 1)
            .writeByte(0)
            .writeByte(message.hairColour)
            .writeByte(message.topColour)
            .writeByte(message.trouserColour)
            .writeByte(message.skinColour);
    },
    bankClose() {},
    bankDeposit(packet, { id, amount }) {
        packet
            .writeShort(id)
            .writeShort(amount)
            .writeInt(MAGIC_BANK_DEPOSIT);
    },
    bankWithdraw(packet, { id, amount }) {
        packet
            .writeShort(id)
            .writeShort(amount)
            .writeInt(MAGIC_BANK_WITHDRAW);
    },
    castGround(packet, message) {
        writeCoords(packet, message);
        packet.writeShort(message.id);
    },
    castInventoryItem(packet, { index, id }) {
        packet.writeShort(index).writeShort(id);
    },
    castNPC(packet, { index, id }) {
        packet.writeShort(index).writeShort(id);
    },
    castObject(packet, message) {
        writeCoords(packet, message);
        packet.writeShort(message.id);
    },
    castPlayer(packet, { index, id }) {
        packet.writeShort(index).writeShort(id);
    },
    castSelf(packet, { id }) {
        packet.writeShort(id);
    },
    castWallObject(packet, message) {
        writeCoords(packet, message);
        packet.writeShort(message.id);
    },
    chat(packet, { message }) {
        packet.writeBytes(encodeMessage(message));
    },
    chooseOption(packet, { option }) {
        packet.writeByte(option);
    },
    combatStyle(packet, { combatStyle }) {
        packet.writeByte(combatStyle);
    },
    command(packet, { command, args }) {
        packet.writeString(`${command} ${args.join(' ')}`);
    },
    duelAccept() {},
    duelConfirmAccept() {},
    duelDecline() {},
    duelItemUpdate: writeTransactionItemUpdate,
    duelSettings(packet, { settings }) {
        for (const setting of DUEL_SETTINGS) {
            packet.writeByte(settings[setting]);
        }
    },
    friendAdd: writeEncodedUsername,
    friendRemove: writeEncodedUsername
};

module.exports = encoders;
