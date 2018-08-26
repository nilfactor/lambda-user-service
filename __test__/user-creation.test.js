const aws = require('aws-sdk-mock');
const realAws = require('aws-sdk');
const object = require('../user-creation');

const TableName = 'user-service-table';

aws.setSDKInstance(realAws);
process.env.NO_LAMBDA_LOG = true;

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
            password: 'bobtestuser',
            firstName: 'Bob',
            lastName: 'User',
            email: 'buser@example.com',
            dateCreated: 20180826095612,
            active: true,
        };

        const expectedError = new Error(
            'missing required fields for entry or data type was not correct or was a falsy value' // eslint-disable-line
        );

        await expect(object.run({ body: JSON.stringify(data) })).rejects.toThrowError(expectedError);
    });

    test('handles dynamodb error as expected when checking user uniquness', async () => {
        const data = {
            username: 'buser',
            password: 'bobtestuser',
            firstName: 'Bob',
            lastName: 'User',
            email: 'buser@example.com',
            dateCreated: 20180826095612,
            dateUpdated: 20180826095612,
            active: true,
        };

        const expectedError = new Error('user lookup dynamodb error');
        const expectedParams = {
            TableName,
            KeyConditionExpression: 'email = :email or username = :username',
            ExpressionAttributeValues: {
                ':email': data.email,
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

    test('throws an error as expected when username or email taken', async () => {
        const data = {
            username: 'buser',
            password: 'bobtestuser',
            firstName: 'Bob',
            lastName: 'User',
            email: 'buser@example.com',
            dateCreated: 20180826095612,
            dateUpdated: 20180826095612,
            active: true,
        };

        const expectedError = new Error('user/email already exists');
        const expectedParams = {
            TableName,
            KeyConditionExpression: 'email = :email or username = :username',
            ExpressionAttributeValues: {
                ':email': data.email,
                ':username': data.username,
            },
        };

        const mockClient = async (params) => {
            expect(params).toEqual(expectedParams);
            return { Items: ['test'] };
        };

        aws.mock('DynamoDB.DocumentClient', 'query', mockClient);
        await expect(object.run({ body: JSON.stringify(data) })).rejects.toThrowError(expectedError);
        aws.restore('DynamoDB.DocumentClient', 'query');
    });

    test('gives an error when dynamodb fails put', async () => {
        const data = {
            username: 'buser',
            password: 'bobtestuser',
            firstName: 'Bob',
            lastName: 'User',
            email: 'buser@example.com',
            dateCreated: 20180826095612,
            dateUpdated: 20180826095612,
            active: true,
        };

        const expectedError = new Error('dynamodb error');
        const expectedParams = {
            TableName,
            KeyConditionExpression: 'email = :email or username = :username',
            ExpressionAttributeValues: {
                ':email': data.email,
                ':username': data.username,
            },
        };

        const mockEmptyLookup = async (params) => {
            expect(params).toEqual(expectedParams);

            return {
                Items: [],
            };
        };

        const mockClient = async (params) => {
            expect(params.Item).toEqual(data);
            throw new Error('simulated error');
        };

        aws.mock('DynamoDB.DocumentClient', 'query', mockEmptyLookup);
        aws.mock('DynamoDB.DocumentClient', 'put', mockClient);
        await expect(object.run({ body: JSON.stringify(data) })).rejects.toThrowError(expectedError);
        aws.restore('DynamoDB.DocumentClient', 'query');
        aws.restore('DynamoDB.DocumentClient', 'put');
    });

    test('works as expect when criteria met', async () => {
        const data = {
            username: 'buser',
            password: 'bobtestuser',
            firstName: 'Bob',
            lastName: 'User',
            email: 'buser@example.com',
            dateCreated: 20180826095612,
            dateUpdated: 20170907133700,
            active: true,
        };

        const mockClient = async (params) => {
            expect(params.Item).toEqual(data);
            return params;
        };

        aws.mock('DynamoDB.DocumentClient', 'query', () => true);
        aws.mock('DynamoDB.DocumentClient', 'put', mockClient);
        const result = await object.run({ body: JSON.stringify(data) });
        expect(result.TableName).toBe(TableName);
        expect(result.Item).toEqual(data);
        aws.restore('DynamoDB.DocumentClient', 'query');
        aws.restore('DynamoDB.DocumentClient', 'put');
    });
});
