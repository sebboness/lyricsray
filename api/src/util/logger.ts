/**
 * Structured JSON logger for Lambda.
 * Lambda pipes stdout to CloudWatch Logs automatically — a Console transport
 * is the correct approach here (no need for a CloudWatch SDK transport).
 */
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});
