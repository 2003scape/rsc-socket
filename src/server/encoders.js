const experienceToLevel = require('../experience-to-level');
const ipInt = require('ip-to-int');
const { encodeMessage } = require('../chat-message');
const { encodeUsername } = require('../username');

const DUEL_SETTINGS = ['retreat', 'magic', 'prayer', 'weapons'];

const EQUIPMENT_BONUS_NAMES = [
    'armour',
    'weaponAim',
    'weaponPower',
    'magic',
    'prayer'
];

const SKILL_NAMES = [
    'attack',
    'defense',
    'strength',
    'hits',
    'ranged',
    'prayer',
    'magic',
    'cooking',
    'woodcutting',
    'fletching',
    'fishing',
    'firemaking',
    'crafting',
    'smithing',
    'mining',
    'herblaw',
    'agility',
    'thieving'
];

function writeKnownCharacters(packet, known) {
    packet.writeBits(known.size, 8);

    for (const character of known) {
        if (character.removing) {
            packet.writeBits(1, 1).writeBits(1, 1).writeBits(12, 4);
        } else if (character.moved) {
            packet
                .writeBits(1, 1)
                .writeBits(0, 1)
                .writeBits(character.sprite, 3);
        } else if (character.spriteChanged) {
            packet
                .writeBits(1, 1)
                .writeBits(1, 1)
                .writeBits(character.sprite, 4);
        } else {
            packet.writeBits(0, 1);
        }
    }
}

function writeAddingCharacters(packet, adding) {
    for (const { index, x, y, sprite, id } of adding) {
        packet
            .writeBits(index, 16)
            .writeBits(x, 5)
            .writeBits(y, 5)
            .writeBits(sprite, 4);

        if (id) {
            packet.writeBits(id, 10);
        } else {
            packet.writeBits(0, 1);
        }
    }
}

function writeHitUpdatesCharacters(packet, hits) {
    for (const { index, damageTaken, currentHealth, maxHealth } of hits) {
        packet
            .writeShort(index)
            .writeBytes([2, damageTaken, currentHealth, maxHealth]);
    }
}

function writeTransactionItems(packet, items) {
    packet.writeByte(items.length);

    for (const { id, amount = 1 } of items) {
        packet.writeShort(id).writeInt(amount);
    }
}

const encoders = {
    appearance() {},
    bankClose() {},
    bankOpen(packet, { maxItems = 48, items }) {
        packet.writeByte(items.length).writeByte(maxItems);

        for (const item of items) {
            packet.writeShort(item.id).writeStackInt(item.amount);
        }
    },
    bankUpdate(packet, { index, id, amount }) {
        packet.writeByte(index).writeShort(id).writeStackInt(amount);
    },
    duelAccepted(packet, { accepted = false }) {
        packet.writeByte(accepted);
    },
    duelClose() {},
    duelConfirmOpen(packet, duel) {
        packet.writeLong(encodeUsername(duel.opponent));

        writeTransactionItems(duel.opponentItems);
        writeTransactionItems(duel.items);

        for (const setting of DUEL_SETTINGS) {
            packet.writeByte(duel[setting]);
        }
    },
    duelOpen(packet, { index }) {
        packet.writeShort(index);
    },
    duelOpponentAccepted(packet, { accepted = false }) {
        packet.writeByte(accepted);
    },
    duelSettings(packet, { settings }) {
        for (const setting of DUEL_SETTINGS) {
            packet.writeByte(settings[setting]);
        }
    },
    duelUpdate(packet, { opponentItems }) {
        for (const item of opponentItems) {
            packet.writeShort(item.id).writeInt(item.amount);
        }
    },
    friendList(packet, { usernames }) {
        packet.writeByte(usernames.length);

        for (const { username, world } of usernames) {
            packet.writeLong(encodeUsername(username)).writeByte(world);
        }
    },
    friendMessage(packet, { username, message }) {
        packet
            .writeLong(encodeUsername(username))
            .writeInt(Math.floor(Math.random() * Math.pow(2, 31)))
            .writeBytes(encodeMessage(message));
    },
    friendStatusChange(packet, { username, world }) {
        packet.writeLong(encodeUsername(username)).writeByte(world);
    },
    gameSettings(packet, { cameraAuto, oneMouseButton, soundOn }) {
        packet
            .writeByte(cameraAuto)
            .writeByte(oneMouseButton)
            .writeByte(soundOn);
    },
    ignoreList(packet, { usernames }) {
        packet.writeByte(usernames.length);

        for (const username of usernames) {
            packet.writeLong(encodeUsername(username));
        }
    },
    inventoryItems(packet, { items }) {
        packet.writeByte(items.length);

        for (const { id, amount = 1, equipped } of items) {
            packet
                .writeShort(id + (equipped ? 32768 : 0))
                .writeStackInt(amount);
        }
    },
    inventoryItemRemove(packet, { index }) {
        packet.writeByte(index);
    },
    inventoryItemUpdate(packet, { index, id, amount }) {
        packet.writeByte(index).writeShort(id).writeStackInt(amount);
    },
    logoutDeny() {},
    message(packet, { message }) {
        packet.writeString(message);
    },
    optionList(packet, { options }) {
        packet.writeByte(options.length);

        for (const option of options) {
            packet.writeByte(option.length);
            packet.writeString(option);
        }
    },
    optionListClose() {},
    playerDied() {},
    playerQuestList(packet, { questCompletion }) {
        for (const completion of questCompletion) {
            packet.writeByte(completion);
        }
    },
    playerStatEquipmentBonus(packet, equipmentBonuses) {
        for (const bonusName of EQUIPMENT_BONUS_NAMES) {
            packet.writeByte(equipmentBonuses[bonusName]);
        }
    },
    playerStatExperienceUpdate(packet, { index, experience }) {
        packet.writeByte(index).writeInt(experience);
    },
    playerStatFatigue(packet, { fatigue }) {
        packet.writeShort(fatigue);
    },
    playerStatFatigueAsleep(packet, { fatigue }) {
        packet.writeShort(fatigue);
    },
    playerStatList(packet, { skills, questPoints }) {
        for (const skillName of SKILL_NAMES) {
            packet.writeByte(skills[skillName].current);
        }

        for (const skillName of SKILL_NAMES) {
            packet.writeByte(experienceToLevel(skills[skillName].experience));
        }

        for (const skillName of SKILL_NAMES) {
            packet.writeInt(skills[skillName].experience);
        }

        packet.writeByte(questPoints);
    },
    prayerStatus(packet, { prayersOn }) {
        for (const on of prayersOn) {
            packet.writeByte(on);
        }
    },
    privacySettings(packet, { chat, privateChat, trade, duel }) {
        packet.writeBytes([chat, privateChat, trade, duel]);
    },
    regionEntityUpdate(packet, { regions }) {
        for (const { x, y } of regions) {
            packet.writeShort(x).writeShort(y);
        }
    },
    regionGroundItems(packet, { removing, adding }) {
        for (const { id, x, y } of removing) {
            // TODO check if it's distance-related, then do 255 maybe?
            packet
                .writeShort(id + 32768)
                .writeByte(x)
                .writeByte(y);
        }

        for (const { id, x, y } of adding) {
            packet.writeShort(id).writeByte(x).writeByte(y);
        }
    },
    regionNPCs(packet, { known, adding }) {
        writeKnownCharacters(packet, known);
        writeAddingCharacters(packet, adding);
    },
    regionNPCUpdate(packet, { chats, hits }) {
        packet.writeShort(chats.length + hits.length);

        for (const { npcIndex, playerIndex, message } of chats) {
            packet.writeShort(npcIndex).writeByte(1).writeShort(playerIndex);

            const encodedMessage = encodeMessage(message);
            packet.writeByte(encodedMessage.length).writeBytes(encodedMessage);
        }

        writeHitUpdatesCharacters(packet, hits);
    },
    regionObjects(packet, { removing, adding }) {
        for (const { x, y } of removing) {
            packet.writeShort(60000).writeByte(x).writeByte(y);
        }

        for (const { id, x, y } of adding) {
            packet.writeShort(id).writeByte(x).writeByte(y);
        }
    },
    regionPlayers(packet, { player, known, adding }) {
        packet
            .writeBits(player.x, 11)
            .writeBits(player.y, 13)
            .writeBits(player.sprite, 4);

        writeKnownCharacters(packet, known);
        writeAddingCharacters(packet, adding);
    },
    regionPlayerUpdate(packet, updates) {
        const length = Object.keys(updates).reduce((a, b) => {
            return a + updates[b].length;
        }, 0);

        packet.writeShort(length);

        for (const { index, id } of updates.bubbleUpdates) {
            packet.writeShort(index).writeByte(0).writeShort(id);
        }

        for (const { index, message, type = 1 } of updates.chats) {
            packet.writeShort(index).writeByte(type);

            const encoded = encodeMessage(message);
            packet.writeByte(encoded.length).writeBytes(encoded);
        }

        writeHitUpdatesCharacters(packet, updates.hits);

        for (const update of updates.projectiles) {
            packet
                .writeShort(update.index)
                .writeShort(update.victimType)
                .writeShort(update.projectileType)
                .writeShort(update.victimIndex);
        }

        for (const update of updates.appearance) {
            packet
                .writeShort(update.index)
                .writeByte(5)
                .addShort(update.appearanceID)
                .writeLong(encodeUsername(update.username))
                .writeByte(update.equipped.length);

            for (const id of update.equipped) {
                packet.writeByte(id);
            }

            packet
                .writeByte(update.hairColour)
                .writeByte(update.topColour)
                .writeByte(update.trouserColour)
                .writeByte(update.skinColour)
                .writeByte(update.combatLevel)
                .writeByte(update.skulled);
        }
    },
    regionWallObjects(packet, { removing, adding }) {
        for (const { x, y, direction } of removing) {
            packet
                .writeShort(65535)
                .writeByte(x)
                .writeByte(y)
                .writeByte(direction);
        }

        for (const { id, x, y, direction } of adding) {
            packet.writeShort(id).writeBytes([x, y, direction]);
        }
    },
    serverMessage(packet, { message }) {
        packet.writeString(message);
    },
    serverMessageOnTop(packet, { message }) {
        packet.writeString(message);
    },
    shopClose() {},
    shopOpen(packet, { items, general, sellMultiplier, buyMultiplier }) {
        packet
            .writeByte(items.length)
            .writeByte(general)
            .writeByte(sellMultiplier)
            .writeByte(buyMultiplier);

        for (const { id, amount = 1, price } of items) {
            packet.writeShort(id).writeShort(amount).writeByte(price);
        }
    },
    sleepClose() {},
    sleepOpen(packet, { captchaBytes }) {
        packet.writeBytes(captchaBytes);
    },
    sound(packet, soundName) {
        packet.writeString(soundName);
    },
    systemUpdate(packet, seconds) {
        packet.writeShort(seconds * 50);
    },
    teleportBubble(packet, { type, x, y }) {
        packet.writeBytes([type, x, y]);
    },
    tradeClose() {},
    tradeConfirmOpen(packet, { recipient, recipientItems, items }) {
        packet.writeLong(encodeUsername(recipient));
        writeTransactionItems(packet, recipientItems);
        writeTransactionItems(packet, items);
    },
    tradeItems(packet, { items }) {
        writeTransactionItems(packet, items);
    },
    tradeOpen(packet, { index }) {
        packet.writeShort(index);
    },
    tradeRecipientStatus(packet, accepted) {
        packet.writeByte(accepted);
    },
    tradeStatus(packet, { accepted }) {
        packet.writeByte(accepted);
    },
    welcome(packet, { lastIP, lastLoginDays, recoveryDays, unreadMessages }) {
        packet
            .writeInt(ipInt(lastIP).toInt())
            .writeShort(lastLoginDays)
            .writeByte(recoveryDays ? recoveryDays : 200)
            .writeShort(unreadMessages);
    },
    worldInfo(packet, info) {
        packet
            .writeShort(info.index)
            .writeShort(info.planeWidth)
            .writeShort(info.planeHeight)
            .writeShort(info.planeIndex)
            .writeShort(info.planeMultiplier);
    }
};

module.exports = encoders;
