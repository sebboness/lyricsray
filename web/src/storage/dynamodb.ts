import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const getDynamoDbClient = (): DynamoDBDocumentClient => {
    const client = new DynamoDBClient({
        region: process.env.AWS_REGION ?? 'us-west-2',
        maxAttempts: 3,
        retryMode: 'adaptive',
    });

    return DynamoDBDocumentClient.from(client, {
        marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
    });
};
