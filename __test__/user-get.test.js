const aws = require('aws-sdk-mock');
const realAws = require('aws-sdk');
const object = require('../user-get');

const TableName = 'user-service-table';

aws.setSDKInstance(realAws);
process.env.NO_LAMBDA_LOG = true;

describe('user-get', async () => {
    test('gives an error when data does not meet expected', async () => {
        const expectedError = new Error('event not as expected');
        await expect(object.run()).rejects.toThrowError(expectedError);
    });

    test('gives an error when malformed body', async () => {
        const data = '{"test": test}';
        const expectedError = new Error('json body malformed');

        await expect(object.run({ body: data })).rejects.toThrowError(expectedError);
    });

    test('gives an error when search key is missing', async () => {
        const data = {
            active: true,
        };

        const expectedError = new Error(
            'missing required fields for entry or data type was not correct or was a falsy value' // eslint-disable-line
        );

        await expect(object.run({ body: JSON.stringify(data) })).rejects.toThrowError(expectedError);
    });

    test('gives an error when dynamodb fails scan', async () => {
        const data = {
            username: '*',
        };

        const expectedError = new Error('dynamo db error');
        const expectedParams = {
            TableName,
            FilterExpression: 'active = :a',
            ExpressionAttributeValues: { ':a': true },
        };

        const mockClient = async (params) => {
            expect(params).toEqual(expectedParams);
            throw new Error('simulated scan error');
        };

        aws.mock('DynamoDB.DocumentClient', 'scan', mockClient);
        await expect(object.run({ body: JSON.stringify(data) })).rejects.toThrowError(expectedError);
        aws.restore('DynamoDB.DocumentClient', 'scan');
    });

    test('gives an error when dynamodb fails query', async () => {
        const data = {
            username: 'tuser',
        };

        const expectedError = new Error('dynamo db error');
        const expectedParams = {
            TableName,
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': data.username,
            },
        };

        const mockClient = async (params) => {
            expect(params).toEqual(expectedParams);
            throw new Error('simulated query error');
        };

        aws.mock('DynamoDB.DocumentClient', 'query', mockClient);
        await expect(object.run({ body: JSON.stringify(data) })).rejects.toThrowError(expectedError);
        aws.restore('DynamoDB.DocumentClient', 'query');
    });


    test('works as expected when returning all users', async () => {
        const data = {
            username: '*',
        };

        const expectedParams = {
            TableName,
            FilterExpression: 'active = :a',
            ExpressionAttributeValues: { ':a': true },
        };

        const expectedResult = ['one', 'two'];

        const mockClient = async (params) => {
            expect(params).toEqual(expectedParams);
            return { Items: expectedResult };
        };

        aws.mock('DynamoDB.DocumentClient', 'scan', mockClient);
        const result = await object.run({ body: JSON.stringify(data) });
        expect(result).toBe(expectedResult);
        aws.restore('DynamoDB.DocumentClient', 'scan');
    });

    test('works as expected when returning a users', async () => {
        const data = {
            username: 'tuser',
        };

        const expectedParams = {
            TableName,
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': data.username,
            },
        };

        const expectedResult = ['tuser'];

        const mockClient = async (params) => {
            expect(params).toEqual(expectedParams);
            return { Items: expectedResult };
        };

        aws.mock('DynamoDB.DocumentClient', 'query', mockClient);
        const result = await object.run({ body: JSON.stringify(data) });
        expect(result).toBe(expectedResult);
        aws.restore('DynamoDB.DocumentClient', 'query');
    });
});
