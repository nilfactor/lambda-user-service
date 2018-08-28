const aws = require('aws-sdk-mock');
const realAws = require('aws-sdk');
const encrypt = require('../lib/encrypt');
const object = require('../user-login');

const TableName = 'user-service-table';

aws.setSDKInstance(realAws);
process.env.NO_LAMBDA_LOG = true;

jest.mock('../lib/encrypt');

afterAll(() => {
    encrypt.mockReset();
});

describe('user-creation', async () => {
    test('gives an error when data does not meet expected', async () => {
        const expectedError = new Error('event not as expected');
        await expect(object.run()).rejects.toThrowError(expectedError);
    });

    test('gives an error when malformed body', async () => {
        const data = '{"test": test}';
        const expectedError = new Error('json body malformed');

        await expect(object.run({ body: data })).rejects.toThrowError(expectedError);
    });

    test('gives an error when field is missing', async () => {
        const data = {
            username: 'buser',
        };

        const expectedError = new Error(
            'missing required fields for entry or data type was not correct or was a falsy value' // eslint-disable-line
        );

        await expect(object.run({ body: JSON.stringify(data) })).rejects.toThrowError(expectedError);
    });

    test('gives an error when dynamodb fails query', async () => {
        const data = {
            username: 'buser',
            password: 'bobtestuser',
        };

        const expectedError = new Error('dynamodb error');
        const expectedParams = {
            TableName,
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': data.username,
            },
        };

        const mockClient = async (params) => {
            expect(params).toEqual(expectedParams);
            throw new Error('simulated error');
        };

        aws.mock('DynamoDB.DocumentClient', 'query', mockClient);
        await expect(object.run({ body: JSON.stringify(data) })).rejects.toThrowError(expectedError);
        aws.restore('DynamoDB.DocumentClient', 'query');
    });

    test('bad password returns object as expected', async () => {
        const data = {
            username: 'buser',
            password: 'bobtestuser',
        };

        const expectedResult = {
            error: 'user not found or invalid password',
        };

        const expectedParams = {
            TableName,
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': data.username,
            },
        };

        const mockClient = async (params) => {
            expect(params).toEqual(expectedParams);
            return {
                Items: [data],
            };
        };

        encrypt.mockReturnValue('test');

        aws.mock('DynamoDB.DocumentClient', 'query', mockClient);
        const result = await object.run({ body: JSON.stringify(data) });
        expect(result).toEqual(expectedResult);
        aws.restore('DynamoDB.DocumentClient', 'query');
    });

    test('user not found returns object as expected', async () => {
        const data = {
            username: 'buser',
            password: 'bobtestuser',
        };

        const expectedResult = {
            error: 'user not found or invalid password',
        };

        const expectedParams = {
            TableName,
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': data.username,
            },
        };

        const mockClient = async (params) => {
            expect(params).toEqual(expectedParams);
            return { test: true };
        };

        aws.mock('DynamoDB.DocumentClient', 'query', mockClient);
        const result = await object.run({ body: JSON.stringify(data) });
        expect(result).toEqual(expectedResult);
        aws.restore('DynamoDB.DocumentClient', 'query');
    });

    test('works as expected if user exists and password matches', async () => {
        const data = {
            username: 'buser',
            password: 'bobtestuser',
        };

        const expectedParams = {
            TableName,
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': data.username,
            },
        };

        const mockClient = async (params) => {
            expect(params).toEqual(expectedParams);
            return {
                Items: [
                    data,
                ],
            };
        };

        encrypt.mockReturnValue(data.password);

        aws.mock('DynamoDB.DocumentClient', 'query', mockClient);
        const result = await object.run({ body: JSON.stringify(data) });
        expect(result).toBe(data);
        aws.restore('DynamoDB.DocumentClient', 'query');
    });
});
