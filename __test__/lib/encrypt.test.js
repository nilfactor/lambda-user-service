const object = require('../../lib/encrypt');

describe('encrypt', () => {
    test('works as expected', () => {
        const password = 'mySecretPassw0rd!';
        const hash = object(password);

        expect(typeof hash).toBe('string');
        expect(hash).not.toBe(password);

        const verifyHash = object(password, hash);
        expect(hash).toEqual(verifyHash);

        const otherPassword = 'superSecret!';
        const notThisHash = object(otherPassword, hash);
        expect(notThisHash).not.toBe(hash);
    });
});
