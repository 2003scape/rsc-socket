const { decodeMessage } = require('../chat-message');
const { decodeUsername } = require('../username');

const HEAD_SPRITES = new Set([1, 4, 6, 7, 8]);

const MAGIC_BANK_DEPOSIT = 0x87654321;
const MAGIC_BANK_WITHDRAW = 0x12345678;

const DUEL_SETTINGS = ['retreat', 'magic', 'prayer', 'weapons'];
const GAME_SETTINGS = {
    0: 'cameraAuto',
    2: 'oneMouseButton',
    3: 'soundOn'
};

function getDecodedUsername(packet) {
    return { username: decodeUsername(packet.getLong()) };
}

function getIndexShort(packet) {
    return { index: packet.getShort() };
}

function getCoords(packet) {
    const x = packet.getShort();
    const y = packet.getShort();

    return { x, y };
}

function getTransactionItemUpdate(packet) {
    const length = packet.getByte();
    const items = [];

    for (let i = 0; i < length; i += 1) {
        const id = packet.getShort();
        const amount = packet.getInt();
        items.push({ id, amount });
    }

    return { items };
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

const decoders = {
    appearance(packet) {
        packet.getByte();

        const headSprite = packet.getByte() + 1;

        if (!HEAD_SPRITES.has(headSprite)) {
            throw new RangeError(`invalid headSprite: ${headSprite}`);
        }

        const bodySprite = packet.getByte() + 1;

        if (bodySprite !== 2 && bodySprite !== 5) {
            throw new RangeError(`invalid bodySprite: ${bodySprite}`);
        }

        // un-needed
        packet.getByte();

        const hairColour = packet.getByte();

        if (hairColour > 9) {
            throw new RangeError(`invalid hairColour: ${hairColour}`);
        }

        const topColour = packet.getByte();

        if (topColour > 14) {
            throw new RangeError(`invalid topColour: ${topColour}`);
        }

        const trouserColour = packet.getByte();

        if (trouserColour > 14) {
            throw new RangeError(`invalid bottomColour: ${trouserColour}`);
        }

        const skinColour = packet.getByte();

        if (skinColour > 4) {
            throw new RangeError(`invalid skinColour: ${skinColour}`);
        }

        return {
            headSprite,
            bodySprite,
            hairColour,
            topColour,
            trouserColour,
            skinColour
        };
    },
    bankClose() {},
    bankDeposit(packet) {
        const slot = packet.getShort();
        const amount = packet.getShort();
        const magic = packet.getInt();

        if (magic !== MAGIC_BANK_DEPOSIT) {
            throw new Error(`invalid magic bank number: ${magic}`);
        }

        return { slot, amount };
    },
    bankWithdraw(packet) {
        const slot = packet.getShort();
        const amount = packet.getShort();
        const magic = packet.getInt();

        if (magic !== MAGIC_BANK_WITHDRAW) {
            throw new Error(`invalid magic bank number: ${magic}`);
        }

        return { slot, amount };
    },
    castGround(packet) {
        const { x, y } = getCoords(packet);
        const id = packet.getShort();

        return { x, y, id };
    },
    castGroundItem(packet) {
        const { x, y } = getCoords(packet);
        const id = packet.getShort();
        const itemID = packet.getShort();

        return { x, y, id, itemID };
    },
    castInventoryItem(packet) {
        const index = packet.getShort();
        const id = packet.getShort();

        return { index, id };
    },
    castNPC(packet) {
        const index = packet.getShort();
        const id = packet.getShort();

        return { index, id };
    },
    castObject(packet) {
        const { x, y } = getCoords(packet);
        const id = packet.getShort();

        return { x, y, id };
    },
    castPlayer(packet) {
        const index = packet.getShort();
        const id = packet.getShort();

        return { index, id };
    },
    castSelf(packet) {
        const id = packet.getShort();

        return { id };
    },
    castWallObject(packet) {
        const { x, y } = getCoords(packet);
        const id = packet.getShort();

        return { x, y, id };
    },
    chat(packet) {
        return { message: decodeMessage(packet.getBytes()) };
    },
    chooseOption(packet) {
        return { option: packet.getByte() };
    },
    closeConnection() {},
    combatStyle(packet) {
        return { combatStyle: packet.getByte() };
    },
    command(packet) {
        const split = packet.getString().split(' ');
        const command = split[0];
        const args = split.slice(1);

        return { command, args };
    },
    duelAccept() {},
    duelConfirmAccept() {},
    duelDecline() {},
    duelItemUpdate: getTransactionItemUpdate,
    duelSettings(packet) {
        const settings = {};

        for (const setting of DUEL_SETTINGS) {
            settings[setting] = packet.getByte();
        }

        return settings;
    },
    friendAdd: getDecodedUsername,
    friendRemove: getDecodedUsername,
    groundItemTake(packet) {
        const { x, y } = getCoords(packet);
        const id = packet.getShort();

        return { x, y, id };
    },
    ignoreAdd: getDecodedUsername,
    ignoreRemove: getDecodedUsername,
    inventoryCommand: getIndexShort,
    inventoryDrop: getIndexShort,
    inventoryUnequip: getIndexShort,
    inventoryWear: getIndexShort,
    knownPlayers(packet) {
        const length = packet.getShort();
        const known = [];

        for (let i = 0; i < length; i += 1) {
            const index = packet.getShort();
            const appearanceIndex = packet.getShort();
            known.push({ index, appearanceIndex });
        }

        return { known };
    },
    login(packet) {
        const reconnecting = !!packet.getByte();
        const version = packet.getShort();
        packet.getByte(); // limit30
        packet.getByte(); // 10

        const keys = [];

        for (let i = 0; i < 4; i += 1) {
            keys.push(packet.getInt());
        }

        const uuid = packet.getInt();
        const username = packet.getString(20).trim().toLowerCase();
        const password = packet.getString(20).trim();

        return { reconnecting, version, keys, uuid, username, password };
    },
    logout() {},
    npcAttack: getIndexShort,
    npcCommand: getIndexShort,
    npcTalk: getIndexShort,
    objectCommandOne: getCoords,
    objectCommandTwo: getCoords,
    ping() {},
    playerAttack: getIndexShort,
    playerDuel: getIndexShort,
    playerFollow: getIndexShort,
    playerTrade: getIndexShort,
    privateMessage(packet) {
        const username = decodeUsername(packet.getLong());
        const message = decodeMessage(packet.getBytes());

        return { username, message };
    },
    register(packet) {
        const version = packet.getShort();
        const username = packet.getString(20).trim().toLowerCase();
        const password = packet.getString(20).trim();

        return { version, username, password };
    },
    prayerOn(packet) {
        return { index: packet.getByte() };
    },
    prayerOff(packet) {
        return { index: packet.getByte() };
    },
    reportAbuse(packet) {
        const username = decodeUsername(packet.getLong());
        const offence = packet.getByte();

        if (offence > 12) {
            throw new RangeError(`invalid offence: ${offence}`);
        }

        const mute = !!packet.getByte();

        return { username, offence, mute };
    },
    session(packet) {
        return { usernameToken: packet.getByte() };
    },
    settingsGame(packet) {
        const index = packet.getByte();
        const settingName = GAME_SETTINGS[index];

        if (!settingName) {
            throw new RangeError(`invalid setting index: ${index}`);
        }

        const settings = {};
        settings[settingName] = !!packet.getByte();

        return settings;
    },
    settingsPrivacy(packet) {
        const chat = !!packet.getByte();
        const privateChat = !!packet.getByte();
        const trade = !!packet.getByte();
        const duel = !!packet.getByte();

        return { chat, privateChat, trade, duel };
    },
    shopBuy(packet) {
        const id = packet.getShort();
        const price = packet.getInt();

        return { id, price };
    },
    shopClose() {},
    shopSell(packet) {
        const id = packet.getShort();
        const price = packet.getInt();

        return { id, price };
    },
    sleepWord(packet) {
        const bytes = packet.getBytes();

        // they're sending us a sleep word during the delay
        if (bytes[bytes.length - 1] !== 0) {
            return;
        }

        packet.offset -= bytes.length;

        return { sleepWord: packet.getString(bytes.length - 1) };
    },
    tradeAccept() {},
    tradeConfirmAccept() {},
    tradeDecline() {},
    tradeItemUpdate: getTransactionItemUpdate,
    useWithGroundItem(packet) {
        const { x, y } = getCoords(packet);
        const groundItemID = packet.getShort();
        const index = packet.getShort();

        return { x, y, groundItemID, index };
    },
    useWithInventoryItem(packet) {
        const index = packet.getShort();
        const withIndex = packet.getShort();

        return { index, withIndex };
    },
    useWithNPC(packet) {
        const npcIndex = packet.getShort();
        const index = packet.getShort();

        return { npcIndex, index };
    },
    useWithObject(packet) {
        const { x, y } = getCoords(packet);
        const index = packet.getShort();

        return { x, y, index };
    },
    useWithPlayer(packet) {
        const playerIndex = packet.getShort();
        const index = packet.getShort();

        return { playerIndex, index };
    },
    useWithWallObject(packet) {
        const { x, y } = getCoords(packet);
        const direction = packet.getByte();
        const index = packet.getShort();

        return { x, y, direction, index };
    },
    walk: getWalk,
    walkAction: getWalk,
    wallObjectCommandOne(packet) {
        const { x, y } = getCoords(packet);
        const index = packet.getShort();

        return { x, y, index };
    },
    wallObjectCommandTwo(packet) {
        const { x, y } = getCoords(packet);
        const index = packet.getShort();

        return { x, y, index };
    }
};

module.exports = decoders;
