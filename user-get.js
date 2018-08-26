const aws = require('aws-sdk');
const log = require('./lib/log');
const verifyFields = require('./lib/verify');

// the aws region our lambda function and dynamodb table are in
const region = process.env.AWS_REGION || 'us-east-1';

// our dynamodb table name, which is located in the region above
const TableName = 'user-service-table';

// the required fields needed to create an entry
const requiredFields = {
    username: 'string',
};

module.exports.run = async (event) => { // eslint-disable-line consistent-return
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

    verifyFields(requiredFields, data);

    try {
        const ddb = new aws.DynamoDB.DocumentClient({ region });
        if (data.username === '*') { // get all users
            const params = {
                TableName,
                FilterExpression: 'active = :a',
                ExpressionAttributeValues: { ':a': true },
            };
            const result = await ddb.scan(params).promise();
            return result.Items || [];
        }
        const params = {
            TableName,
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': data.username,
            },
        };

        const result = await ddb.query(params).promise();
        return result.Items || [];
    } catch (error) {
        log('error', error);
        throw new Error('dynamo db error');
    }
};
