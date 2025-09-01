import { logger } from "@/logger/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Gets a new instance of the DynamoDB client
 * @returns A new instance of the DynamoDB client
 */
export const getDynamoDbClient = () => {

    logger.info(`process.env.APP_SERVICE_ROLE_ARN: ${process.env.APP_SERVICE_ROLE_ARN}`);

    const isLocal = !!process.env.IS_LOCAL;
    
    const credentials = isLocal
        ? undefined
        : fromTemporaryCredentials({
            params: {
                RoleArn: process.env.APP_SERVICE_ROLE_ARN,
                RoleSessionName: "in-app",
            },
        });

    const client = new DynamoDBClient({
        region: process.env.AWS_REGION!,
        credentials,
        maxAttempts: 3,
        retryMode: "adaptive",
    });

    return DynamoDBDocumentClient.from(client, {
        marshallOptions: {
            removeUndefinedValues: true,
            convertEmptyValues: true,
            convertClassInstanceToMap: true,
        },
        unmarshallOptions: {
            // Optional: configure unmarshalling options if needed
        },
    });
}
