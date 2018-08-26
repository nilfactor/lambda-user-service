/**
 * @desc  Log data out to the console
 * @param string type - the type of message ie: log, warn, error
 * @param mixed what - what we wish to log to the console
 */
module.exports = (type, what) => {
    // istanbul ignore if
    if (typeof process.env.NO_LAMBDA_LOG === 'undefined') {
        console[type](what);
    }
};
