import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Gets a new instance of the DynamoDB client
 * @returns A new instance of the DynamoDB client
 */
export const getDynamoDbClient = () => {

    const client = new DynamoDBClient({
        region: process.env.AWS_REGION!,
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
