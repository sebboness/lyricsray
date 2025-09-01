import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { logger } from "@/logger/logger";

/**
 * Gets a new instance of the DynamoDB client
 * @returns A new instance of the DynamoDB client
 */
export const getDynamoDbClient = async () => {

    logger.info(`process.env.APP_SERVICE_ROLE_ARN: ${process.env.APP_SERVICE_ROLE_ARN}`);

    const isLocal = !!process.env.IS_LOCAL;
    let credentials: any = undefined;

    if (!isLocal) {
        try {

            // Assume the role to get temporary credentials
            const stsClient = new STSClient({ region: process.env.AWS_REGION });
            const assumeRoleParams = {
                RoleArn: process.env.APP_SERVICE_ROLE_ARN,
                RoleSessionName: `in-app-${Date.now()}`,
            };

            const command = new AssumeRoleCommand(assumeRoleParams);
            const data = await stsClient.send(command);

            if (data && data.Credentials) {
                credentials = {
                    accessKeyId: data.Credentials.AccessKeyId,
                    secretAccessKey: data.Credentials.SecretAccessKey,
                    sessionToken: data.Credentials.SessionToken,
                };
            }
            else {
                logger.warn("Unexpected response received from STSClient", data);
            }
        }
        catch (err) {
                logger.error("Failed to retrieve credentials from STSClient", err);
        }
    }
    
    // const credentials = isLocal
    //     ? undefined
    //     : fromTemporaryCredentials({
    //         params: {
    //             RoleArn: process.env.APP_SERVICE_ROLE_ARN,
    //             RoleSessionName: "in-app",
    //         },
    //     });

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
