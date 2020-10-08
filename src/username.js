const Long = require('long');

const C_A = 'a'.charCodeAt(0);
const C_Z = 'z'.charCodeAt(0);
const C_0 = '0'.charCodeAt(0);
const C_9 = '9'.charCodeAt(0);

// performs the "base 37" operations on usernames, required for player
// appearance and messaging packets. we have to use the `long` module as Number
// isn't large enough to hold 64 bit integers

function encodeUsername(username) {
    let encoded = Long.fromInt(0, true);

    username = username.toLowerCase().trim();

    for (let i = 0; i < username.length; i += 1) {
        const character = username.charCodeAt(i);

        encoded = encoded.multiply(37);

        if (character >= C_A && character <= C_Z) {
            encoded = encoded.add(character - 96);
        } else if (character >= C_0 && character <= C_9) {
            encoded = encoded.add(character - 21);
        }
    }

    return encoded;
}

function decodeUsername(encoded) {
    if (encoded.lessThan(0)) {
        return 'invalidName';
    }

    let username = '';

    while (!encoded.equals(0)) {
        let i = encoded.modulo(37).toInt();
        encoded = encoded.divide(37);

        if (i === 0) {
            username = ' ' + username;
        } else if (i < 27) {
            if (encoded.modulo(37).equals(0)) {
                username = String.fromCharCode(i + 65 - 1) + username;
            } else {
                username = String.fromCharCode(i + 97 - 1) + username;
            }
        } else {
            username = String.fromCharCode(i + 48 - 27) + username;
        }
    }

    return username;
}

module.exports = { encodeUsername, decodeUsername };
