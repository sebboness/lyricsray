import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
    region: process.env.AWS_REGION!,
});

// Document client makes it easier to work with native JS objects
export const ddbDocClient = DynamoDBDocumentClient.from(client);
