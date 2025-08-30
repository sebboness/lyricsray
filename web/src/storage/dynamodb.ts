import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Document client makes it easier to work with native JS objects
export const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({
        region: process.env.AWS_REGION!,
    }), {
    marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: true,
        convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
        // Optional: configure unmarshalling options if needed
    },
});
