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
    password: 'string',
};

module.exports.run = async (event) => {
    let data;
    const badLogin = {
        error: 'user not found or invalid password',
    };

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

    verifyFields(requiredFields, data);

    try {
        const ddb = new aws.DynamoDB.DocumentClient({ region });
        const params = {
            TableName,
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': data.username,
            },
        };

        const result = await ddb.query(params).promise();
        const user = result.Items || [];
        if (user.length === 0) {
            return badLogin;
        }

        const hash = encrypt(data.password, user.password);
        if (hash === user[0].password) {
            return user[0];
        }
    } catch (error) {
        log('error', error);
        throw new Error('dynamodb error');
    }

    return badLogin;
};
