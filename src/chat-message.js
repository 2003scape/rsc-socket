// used to compress chat/private messages.

const C_A = 'a'.charCodeAt(0);
const C_AT = '@'.charCodeAt(0);
const C_DOT = '.'.charCodeAt(0);
const C_EXCLM = '!'.charCodeAt(0);
const C_PRCNT = '%'.charCodeAt(0);
const C_SPACE = ' '.charCodeAt(0);
const C_Z = 'z'.charCodeAt(0);
const C_CENT = '\uFFE0'.charCodeAt(0);

const CHAR_MAP = new Uint16Array(
    [
        ' ',
        'e',
        't',
        'a',
        'o',
        'i',
        'h',
        'n',
        's',
        'r',
        'd',
        'l',
        'u',
        'm',
        'w',
        'c',
        'y',
        'f',
        'g',
        'p',
        'b',
        'v',
        'k',
        'x',
        'j',
        'q',
        'z',
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        ' ',
        '!',
        '?',
        '.',
        ',',
        ':',
        ';',
        '(',
        ')',
        '-',
        '&',
        '*',
        '\\',
        "'",
        '@',
        '#',
        '+',
        '=',
        '\243',
        '$',
        '%',
        '"',
        '[',
        ']'
    ].map((c) => c.charCodeAt(0))
);

function fromCharArray(a) {
    return Array.from(a)
        .map((c) => String.fromCharCode(c))
        .join('');
}

function decodeMessage(encoded) {
    const decoded = new Uint16Array(100);

    let offset = 0;

    try {
        let newLen = 0;
        let leftShift = -1;

        for (let i = 0; i < encoded.length; i++) {
            let current = encoded[offset++] & 0xff;
            let charMapIndex = (current >> 4) & 0xf;

            if (leftShift === -1) {
                if (charMapIndex < 13) {
                    decoded[newLen++] = CHAR_MAP[charMapIndex];
                } else {
                    leftShift = charMapIndex;
                }
            } else {
                decoded[newLen++] =
                    CHAR_MAP[(leftShift << 4) + charMapIndex - 195];
                leftShift = -1;
            }

            charMapIndex = current & 0xf;

            if (leftShift === -1) {
                if (charMapIndex < 13) {
                    decoded[newLen++] = CHAR_MAP[charMapIndex];
                } else {
                    leftShift = charMapIndex;
                }
            } else {
                decoded[newLen++] =
                    CHAR_MAP[(leftShift << 4) + charMapIndex - 195];
                leftShift = -1;
            }
        }

        let flag = true;

        for (let i = 0; i < newLen; i++) {
            const currentChar = decoded[i];

            if (i > 4 && currentChar === C_AT) {
                decoded[i] = C_SPACE;
            }

            if (currentChar === C_PRCNT) {
                decoded[i] = C_SPACE;
            }

            if (flag && currentChar >= C_A && currentChar <= C_Z) {
                decoded[i] += C_CENT;
                flag = false;
            }

            if (currentChar === C_DOT || currentChar === C_EXCLM) {
                flag = true;
            }
        }

        return fromCharArray(decoded.slice(0, newLen)).trim();
    } catch (e) {
        return '.';
    }
}

function encodeMessage(message) {
    const encoded = new Int8Array(100);

    if (message.length > 80) {
        message = message.slice(0, 80);
    }

    message = message.toLowerCase();

    let offset = 0;
    let leftShift = -1;

    for (let i = 0; i < message.length; i++) {
        const currentChar = message.charCodeAt(i);
        let charMapIndex = 0;

        for (let n = 0; n < CHAR_MAP.length; n++) {
            if (currentChar !== CHAR_MAP[n]) {
                continue;
            }

            charMapIndex = n;
            break;
        }

        if (charMapIndex > 12) {
            charMapIndex += 195;
        }

        if (leftShift === -1) {
            if (charMapIndex < 13) {
                leftShift = charMapIndex;
            } else {
                encoded[offset++] = charMapIndex & 0xff;
            }
        } else if (charMapIndex < 13) {
            encoded[offset++] = ((leftShift << 4) + charMapIndex) & 0xff;
            leftShift = -1;
        } else {
            encoded[offset++] = ((leftShift << 4) + (charMapIndex >> 4)) & 0xff;
            leftShift = charMapIndex & 0xf;
        }
    }

    if (leftShift !== -1) {
        encoded[offset++] = (leftShift << 4) & 0xff;
    }

    return encoded.slice(0, offset);
}

module.exports = { encodeMessage, decodeMessage };
