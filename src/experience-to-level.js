const EXPERIENCE_ARRAY = [];

let totalExp = 0;

for (let i = 0; i < 99; i++) {
    const level = i + 1;
    const exp = (level + 300 * Math.pow(2, level / 7)) | 0;
    totalExp += exp;
    EXPERIENCE_ARRAY[i] = totalExp & 0xffffffc;
}

function experienceToLevel(experience) {
    let level = 1;

    for (let i = 0; i < EXPERIENCE_ARRAY.length; i += 1) {
        if (EXPERIENCE_ARRAY[i] > experience) {
            return level;
        }

        level = i + 1;
    }

    return level;
}

module.exports = experienceToLevel;
