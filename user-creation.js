const aws = require('aws-sdk');
const encrypt = require('./lib/encrypt');
const log = require('./lib/log');
const verifyFields = require('./lib/verify');

// the aws region our lambda function and dynamodb table are in
const region = process.env.AWS_REGION || 'us-east-1';

// our dynamodb table name, which is located in the region above
const TableName = 'user-service-table';

// the required fields needed to create an entry
const requiredFields = {
    username: 'string',
    email: 'string',
    firstName: 'string',
    dateCreated: 'number',
    dateUpdated: 'number',
    active: 'boolean',
};

/**
 * @desc  verify that the username/email is not already taken
 * @param object data - the user account information we want to store
 */
const checkUserUnique = async (data) => {
    const params = {
        TableName,
        KeyConditionExpression: 'email = :email or username = :username',
        ExpressionAttributeValues: {
            ':email': data.email,
            ':username': data.username,
        },
    };

    let results;

    try {
        const ddb = new aws.DynamoDB.DocumentClient({ region });
        results = await ddb.query(params).promise();

        /* istanbul ignore next */
        results = results.Items || [];
    } catch (error) {
        log('error', error);
        throw new Error('user lookup dynamodb error');
    }

    if (results.length > 0) {
        throw new Error('user/email already exists');
    }
};

module.exports.run = async (event) => {
    let data;

    // make sure event matches as we would expect
    if (typeof event === 'undefined' || typeof event.body === 'undefined') {
        log('error', 'event not as expected');
        throw new Error('event not as expected');
    }

    // convert data to JSON object
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        log('error', error);
        throw new Error('json body malformed');
    }

    // verify the data
    verifyFields(requiredFields, data);

    // assume this is a new user, verify account uniquness
    if (data.dateCreated === data.dateUpdated) {
        await checkUserUnique(data);
        if (typeof data.password !== 'string' || !data.password) {
            throw new Error('password required');
        }
    }

    /* istanbul ignore next */
    if (typeof data.password === 'string') {
        data.password = encrypt(data.password);
    }

    const params = {
        TableName,
        Item: data,
    };

    try {
        const ddb = new aws.DynamoDB.DocumentClient();
        const result = await ddb.put(params).promise();
        return result;
    } catch (error) {
        log('error', error);
        throw new Error('dynamodb error');
    }
};
