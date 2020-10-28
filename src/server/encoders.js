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

        for (const { id, amount, equipped } of items) {
            packet
                .writeShort(id + (equipped ? 32768 : 0));

            if (typeof amount === 'number') {
                packet.writeStackInt(amount);
            }
        }
    },
    inventoryItemRemove(packet, { index }) {
        packet.writeByte(index);
    },
    inventoryItemUpdate(packet, { index, id, amount, equipped }) {
        packet
            .writeByte(index)
            .writeShort(id + (equipped ? 32768 : 0));

        if (typeof amount === 'number') {
            packet.writeStackInt(amount);
        }
    },
    logoutDeny() {},
    logoutSuccess() {},
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
            packet.writeByte(skills[skillName].base);
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
        packet.writeBits(known.length, 8);

        for (const npc of known) {
            if (npc.removing) {
                packet.writeBits(1, 1).writeBits(1, 1).writeBits(3, 2);
            } else if (npc.moved) {
                packet.writeBits(1, 1).writeBits(0, 1).writeBits(npc.sprite, 3);
            } else if (npc.spriteChanged) {
                packet.writeBits(1, 1).writeBits(1, 1).writeBits(npc.sprite, 4);
            } else {
                packet.writeBits(0, 1);
            }
        }

        for (const { index, x, y, sprite, id } of adding) {
            packet
                .writeBits(index, 12)
                .writeBits(x, 5)
                .writeBits(y, 5)
                .writeBits(sprite, 4)
                .writeBits(id, 10);
        }
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
    regionObjects(packet, { removing = [], adding = [] }) {
        for (const { x, y } of removing) {
            packet.writeShort(60000).writeByte(x).writeByte(y);
        }

        for (const { id, x, y } of adding) {
            packet.writeShort(id).writeByte(x).writeByte(y);
        }
    },
    regionPlayers(packet, { player, known = [], adding = [] }) {
        packet
            .writeBits(player.x, 11)
            .writeBits(player.y, 13)
            .writeBits(player.sprite, 4);

        packet.writeBits(known.length, 8);

        for (const player of known) {
            if (player.removing) {
                packet.writeBits(1, 1).writeBits(1, 1).writeBits(3, 2);
            } else if (player.moved) {
                packet
                    .writeBits(1, 1)
                    .writeBits(0, 1)
                    .writeBits(player.sprite, 3);
            } else if (player.spriteChanged) {
                packet
                    .writeBits(1, 1)
                    .writeBits(1, 1)
                    .writeBits(player.sprite, 4);
            } else {
                packet.writeBits(0, 1);
            }
        }

        for (const { index, x, y, sprite } of adding) {
            packet
                .writeBits(index, 11)
                .writeBits(x, 5)
                .writeBits(y, 5)
                .writeBits(sprite, 4)
                .writeBits(0, 1);
        }
    },
    regionPlayerUpdate(packet, updates) {
        const length = Object.keys(updates).reduce((length, type) => {
            if (!Array.isArray(updates[type])) {
                updates[type] = [];
            }

            return length + updates[type].length;
        }, 0);

        packet.writeShort(length);

        for (const { index, id } of updates.bubbles) {
            packet.writeShort(index).writeByte(0).writeShort(id);
        }

        for (const { index, message, dialogue = false } of updates.chats) {
            packet.writeShort(index).writeByte(dialogue ? 6 : 1);

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

        for (const update of updates.appearances) {
            packet
                .writeShort(update.index)
                .writeByte(5)
                .writeShort(update.appearanceIndex)
                .writeLong(encodeUsername(update.username))
                .writeByte(update.animations.length);

            for (const id of update.animations) {
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
    sound(packet, { soundName }) {
        packet.writeString(soundName);
    },
    systemUpdate(packet, { seconds }) {
        packet.writeShort(seconds * 50);
    },
    teleportBubble(packet, { bubbleType, x, y }) {
        packet.writeBytes([bubbleType, x, y]);
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
