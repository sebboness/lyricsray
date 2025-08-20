import winston from "winston";
import WinstonCloudWatch from 'winston-cloudwatch';

const logGroupName = `/aws/amplify/apps/${process.env.APP_NAME?.toLocaleLowerCase()}/${process.env.ENV?.toLocaleLowerCase()}`;

// Create the logger
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL,
    format: winston.format.json(),
    transports: [
        // Console transport for local development
        new winston.transports.Console(),

        // CloudWatch transport
        new WinstonCloudWatch({
            logGroupName: logGroupName,
            logStreamName() {
                // Spread log streams across dates as the server stays up
                const date = new Date().toISOString().split('T')[0];
                return 'logs-' + date;
            },
            awsRegion: `${process.env.AWS_REGION}`,
            messageFormatter(logObject) {
                return JSON.stringify(logObject);
            },
        }),
    ],
});
