import { logger } from "@/logger/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Test function to verify the setup
export async function debugCredentialChain() {
    logger.info('Environment variables:');
    logger.info('- AWS_REGION:', process.env.AWS_REGION);
    logger.info('- AWS_DEFAULT_REGION:', process.env.AWS_DEFAULT_REGION);
    logger.info('- NODE_ENV:', process.env.NODE_ENV);
    logger.info('- ENV:', process.env.ENV);
    
    // Check if we can access instance metadata (this should work on Amplify)
    try {
        const response = await fetch('http://169.254.169.254/latest/meta-data/iam/security-credentials/', { });

        if (response.ok) {
            const roles = await response.text();
            logger.info('Available instance roles:', roles);
        } else {
            logger.info('Instance metadata not available', response);
        }
    } catch (error) {
        logger.error('Instance metadata check failed:', error);
    }
}

/**
 * Gets a new instance of the DynamoDB client
 * @returns A new instance of the DynamoDB client
 */
export const getDynamoDbClient = () => {

    const client = new DynamoDBClient({
        region: process.env.AWS_REGION!,
        credentials: undefined, // Explicitly undefined to force credential chain
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
