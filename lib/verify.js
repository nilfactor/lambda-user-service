/**
 * @desc  verify that the required fields are set and match the data type we expect, validating the data in
 * @param object requiredFields - the required fields and type
 * @param object data - the user account information we want to store
 */
module.exports = (requiredFields, data) => {
    const keys = Object.keys(requiredFields);
    keys.forEach((key) => {
        /* eslint-disable valid-typeof */
        if (typeof data[key] === 'undefined' || typeof data[key] !== requiredFields[key] || !data[key]) {
            /**
             * left for trouble shooting
             * console.log('data[key] => ', typeof data[key]);
             * console.log('requiredFields[key] => ', requiredFields[key]);
             * console.log('key => ', key);
             */
            throw new Error('missing required fields for entry or data type was not correct or was a falsy value');
        }
    });
};
