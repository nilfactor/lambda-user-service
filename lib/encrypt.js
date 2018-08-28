const crypto = require('crypto');

const generateRandomString = (length) => {
    const hash = crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);

    return hash;
};

module.exports = (password, salt) => {
    let salty;

    if (salt) {
        const parts = salt.split(':');
        salty = parts[0]; // eslint-disable-line prefer-destructuring
    } else {
        salty = generateRandomString(16);
    }

    const hash = crypto.pbkdf2Sync(password, salty, 10000, 64, 'sha512').toString('hex');
    return `${salty}:${hash}`;
};
