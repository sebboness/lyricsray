import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { logger } from "@/logger/logger";

const client = new DynamoDBClient({
    region: process.env.AWS_REGION!,
});

export const testCredentials = async () => {
    try {
        logger.info(`the region: ${process.env.AWS_REGION}`);

        const stsClient = new STSClient({ 
            region: process.env.AWS_REGION || "us-west-2" 
        });
        const identity = await stsClient.send(new GetCallerIdentityCommand({}));
        logger.log('Successfully loaded credentials. Identity:', {
            userId: identity.UserId,
            account: identity.Account,
            arn: identity.Arn,
        });
        return true;
    } catch (error) {
        logger.error('Failed to load credentials:', error);
        return false;
    }
}

// Document client makes it easier to work with native JS objects
export const ddbDocClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: true,
        convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
        // Optional: configure unmarshalling options if needed
    },
});
