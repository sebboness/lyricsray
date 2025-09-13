import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import moment from 'moment';
import { logger } from '@/logger/logger';

const moduleName = "RateLimiter";
const tableName = `${process.env.APP_NAME!.toLowerCase()}-${process.env.ENV?.toLowerCase()}-analysis-rate-limiter`;

interface RateLimitConfig {
    hourlyLimit: number;
    dailyLimit: number;
    globalDailyLimit: number;
    burstLimit: number;
    burstWindowMinutes: number;
}

interface RateLimitRecord {
    id: string; // IP address or 'GLOBAL'
    date: string; // YYYY-MM-DD format
    hour: string; // YYYY-MM-DD-HH format
    hourlyCount: number;
    dailyCount: number;
    burstCount: number;
    burstWindowStart?: string;
    ttl: number; // DynamoDB TTL
}

interface RateLimitResult {
    allowed: boolean;
    reason?: string;
    retryAfter?: number; // seconds
    remaining: {
        hourly: number;
        daily: number;
        burst: number;
    };
}

export class RateLimiter {
    private dbClient: DynamoDBDocumentClient;
    private config: RateLimitConfig;

    /**
     * Creates a new RateLimiter instance with atomic operations for concurrency safety
     * @param {DynamoDBDocumentClient} dbClient - The DynamoDB client instance
     * @param {Partial<RateLimitConfig>} [config] - Optional configuration overrides for rate limits
     */
    constructor(
        dbClient: DynamoDBDocumentClient,
        config?: Partial<RateLimitConfig>
    ) {
        this.dbClient = dbClient;
        
        // Import and use the configuration
        const { getRateLimitConfigForUser } = require('@/config/rateLimitConfig');
        const defaultConfig = getRateLimitConfigForUser('free');
        
        this.config = {
            ...defaultConfig,
            ...config
        };
    }

    /**
     * Atomically checks all rate limits and increments counters if allowed.
     * This is the main method that prevents race conditions by combining check + increment operations.
     * @param {string} ipAddress - The client's IP address to check rate limits for
     * @returns {Promise<RateLimitResult>} Promise resolving to rate limit result with allowed status and remaining counts
     */
    async checkAndIncrementRateLimit(ipAddress: string): Promise<RateLimitResult> {
        const now = moment.utc();
        const dateStr = now.format('YYYY-MM-DD');
        const hourStr = now.format('YYYY-MM-DD-HH');

        try {
            // First check global rate limit atomically
            const globalResult = await this.checkAndIncrementGlobal(dateStr);
            if (!globalResult.allowed) {
                return globalResult;
            }

            // Then check IP-specific limits atomically
            const ipResult = await this.checkAndIncrementIp(ipAddress, dateStr, hourStr, now);
            
            return ipResult;

        } catch (error) {
            logger.error('Atomic rate limit check failed', { error, ipAddress });
            // Fail open - allow request if rate limiting service is down
            return {
                allowed: true,
                remaining: {
                    hourly: this.config.hourlyLimit,
                    daily: this.config.dailyLimit,
                    burst: this.config.burstLimit
                }
            };
        }
    }

    /**
     * Atomically checks and increments the global daily counter to prevent exceeding budget limits.
     * Uses conditional DynamoDB updates to ensure global limits are enforced across all users.
     * @param {string} dateStr - The date string in YYYY-MM-DD format for the current day
     * @returns {Promise<RateLimitResult>} Promise resolving to rate limit result for global limits
     * @private
     */
    private async checkAndIncrementGlobal(dateStr: string): Promise<RateLimitResult> {
        const globalId = `GLOBAL-${dateStr}`;
        const ttl = moment.utc().add(2, 'days').unix();

        try {
            // Try to atomically increment if under limit
            await this.dbClient.send(new UpdateCommand({
                TableName: tableName,
                Key: { id: globalId },
                UpdateExpression: 'ADD dailyCount :inc SET #date = :date, #ttl = :ttl',
                ConditionExpression: 'dailyCount < :limit OR attribute_not_exists(dailyCount)',
                ExpressionAttributeNames: {
                    '#date': 'date',
                    '#ttl': 'ttl'
                },
                ExpressionAttributeValues: {
                    ':inc': 1,
                    ':date': dateStr,
                    ':ttl': ttl,
                    ':limit': this.config.globalDailyLimit
                }
            }));

            // If we get here, the increment succeeded
            return {
                allowed: true,
                remaining: {
                    hourly: this.config.hourlyLimit,
                    daily: this.config.dailyLimit,
                    burst: this.config.burstLimit
                }
            };

        } catch (error) {
            if (error instanceof ConditionalCheckFailedException) {
                // Global limit exceeded
                logger.warn('Global daily limit exceeded', { dateStr, limit: this.config.globalDailyLimit });
                
                return {
                    allowed: false,
                    reason: 'Global daily limit exceeded. Please try again tomorrow.',
                    retryAfter: this.getSecondsUntilMidnight(),
                    remaining: {
                        hourly: 0,
                        daily: 0,
                        burst: 0
                    }
                };
            }
            
            // Other error - rethrow
            throw error;
        }
    }

    /**
     * Atomically checks and increments IP-specific counters (hourly, daily, burst) in a single operation.
     * Handles complex logic for different time windows and burst detection.
     * @param {string} ipAddress - The client's IP address
     * @param {string} dateStr - The date string in YYYY-MM-DD format
     * @param {string} hourStr - The hour string in YYYY-MM-DD-HH format
     * @param {moment.Moment} now - The current moment instance for time calculations
     * @returns {Promise<RateLimitResult>} Promise resolving to rate limit result for IP-specific limits
     * @private
     */
    private async checkAndIncrementIp(
        ipAddress: string, 
        dateStr: string, 
        hourStr: string, 
        now: moment.Moment
    ): Promise<RateLimitResult> {
        const ipId = `IP-${ipAddress}-${dateStr}`;
        const ttl = moment.utc().add(2, 'days').unix();

        // First, get current record to handle complex burst logic
        let currentRecord: RateLimitRecord | undefined;
        
        try {
            const result = await this.dbClient.send(new GetCommand({
                TableName: tableName,
                Key: { id: ipId }
            }));
            currentRecord = result.Item as RateLimitRecord;
        } catch (error) {
            logger.warn('Failed to get current IP record', { error, ipAddress });
            // Continue without current record
        }

        // Calculate burst window state
        const burstState = this.calculateBurstState(currentRecord, now);
        
        if (!burstState.allowed) {
            return {
                ...burstState,
                remaining: {
                    hourly: 0,
                    daily: 0,
                    burst: burstState.remaining
                }
            };
        }

        // Now try to atomically update all counters with multiple conditions
        try {
            const isNewHour = !currentRecord || currentRecord.hour !== hourStr;
            const newHourlyCount = isNewHour ? 1 : (currentRecord?.hourlyCount || 0) + 1;

            // Build the atomic update with multiple conditions
            const conditionParts = [];
            const attributeValues: any = {
                ':dailyInc': 1,
                ':hourlyCount': newHourlyCount,
                ':date': dateStr,
                ':hour': hourStr,
                ':ttl': ttl,
                ':burstCount': burstState.newBurstCount,
                ':burstWindowStart': burstState.burstWindowStart,
                ':dailyLimit': this.config.dailyLimit,
                ':hourlyLimit': this.config.hourlyLimit
            };

            // Daily limit condition
            conditionParts.push('(dailyCount < :dailyLimit OR attribute_not_exists(dailyCount))');
            
            // Hourly limit condition
            conditionParts.push('(:hourlyCount <= :hourlyLimit)');

            const updateExpression = isNewHour 
                ? 'SET hourlyCount = :hourlyCount, #date = :date, #hour = :hour, #ttl = :ttl, burstCount = :burstCount, burstWindowStart = :burstWindowStart ADD dailyCount :dailyInc'
                : 'ADD hourlyCount :dailyInc, dailyCount :dailyInc SET #date = :date, #hour = :hour, #ttl = :ttl, burstCount = :burstCount, burstWindowStart = :burstWindowStart';

            await this.dbClient.send(new UpdateCommand({
                TableName: tableName,
                Key: { id: ipId },
                UpdateExpression: updateExpression,
                ConditionExpression: conditionParts.join(' AND '),
                ExpressionAttributeNames: {
                    '#date': 'date',
                    '#hour': 'hour',
                    '#ttl': 'ttl'
                },
                ExpressionAttributeValues: attributeValues
            }));

            // Success! Calculate remaining limits
            const newDailyCount = (currentRecord?.dailyCount || 0) + 1;
            
            return {
                allowed: true,
                remaining: {
                    hourly: Math.max(0, this.config.hourlyLimit - newHourlyCount),
                    daily: Math.max(0, this.config.dailyLimit - newDailyCount),
                    burst: Math.max(0, this.config.burstLimit - burstState.newBurstCount)
                }
            };

        } catch (error) {
            if (error instanceof ConditionalCheckFailedException) {
                // One of our limits was exceeded - determine which one
                const currentHourlyCount = currentRecord?.hour === hourStr ? currentRecord.hourlyCount : 0;
                const currentDailyCount = currentRecord?.dailyCount || 0;

                if (currentDailyCount >= this.config.dailyLimit) {
                    return {
                        allowed: false,
                        reason: 'Daily limit exceeded. Please try again tomorrow.',
                        retryAfter: this.getSecondsUntilMidnight(),
                        remaining: {
                            hourly: 0,
                            daily: 0,
                            burst: burstState.remaining
                        }
                    };
                }

                if (currentHourlyCount >= this.config.hourlyLimit) {
                    return {
                        allowed: false,
                        reason: 'Hourly limit exceeded. Please wait before trying again.',
                        retryAfter: this.getSecondsUntilNextHour(),
                        remaining: {
                            hourly: 0,
                            daily: Math.max(0, this.config.dailyLimit - currentDailyCount),
                            burst: burstState.remaining
                        }
                    };
                }

                // Shouldn't reach here, but handle gracefully
                return {
                    allowed: false,
                    reason: 'Rate limit exceeded.',
                    retryAfter: 3600,
                    remaining: {
                        hourly: 0,
                        daily: 0,
                        burst: 0
                    }
                };
            }
            
            // Other error - rethrow
            throw error;
        }
    }

    /**
     * Calculates burst window state and validates if the request is within burst limits.
     * Determines if a new burst window should be started or if existing window limits are exceeded.
     * @param {RateLimitRecord | undefined} record - The existing rate limit record from DynamoDB, or undefined if none exists
     * @param {moment.Moment} now - The current moment instance for time window calculations
     * @returns {Object} Object containing allowed status, new burst count, window start time, and remaining burst requests
     * @returns {boolean} returns.allowed - Whether the request is allowed within burst limits
     * @returns {number} returns.newBurstCount - The new burst count after this request
     * @returns {string} returns.burstWindowStart - ISO string of when the current burst window started
     * @returns {number} returns.remaining - Number of burst requests remaining in current window
     * @returns {string} [returns.reason] - Human-readable reason if request is denied
     * @returns {number} [returns.retryAfter] - Seconds to wait before retrying if denied
     * @private
     */
    private calculateBurstState(
        record: RateLimitRecord | undefined, 
        now: moment.Moment
    ): { 
        allowed: boolean; 
        newBurstCount: number; 
        burstWindowStart: string; 
        remaining: number;
        reason?: string;
        retryAfter?: number;
    } {
        if (!record?.burstWindowStart) {
            // No existing burst window - start a new one
            return {
                allowed: true,
                newBurstCount: 1,
                burstWindowStart: now.toISOString(),
                remaining: this.config.burstLimit - 1
            };
        }

        const burstWindowStart = moment.utc(record.burstWindowStart);
        const windowEnd = burstWindowStart.clone().add(this.config.burstWindowMinutes, 'minutes');

        // If we're outside the burst window, start a new one
        if (now.isAfter(windowEnd)) {
            return {
                allowed: true,
                newBurstCount: 1,
                burstWindowStart: now.toISOString(),
                remaining: this.config.burstLimit - 1
            };
        }

        // We're within the burst window - check if we've exceeded the limit
        const currentBurstCount = record.burstCount || 0;
        if (currentBurstCount >= this.config.burstLimit) {
            return {
                allowed: false,
                newBurstCount: currentBurstCount,
                burstWindowStart: record.burstWindowStart,
                remaining: 0,
                reason: `Rate limit exceeded. Please wait ${windowEnd.diff(now, 'minutes')} minutes before trying again.`,
                retryAfter: windowEnd.diff(now, 'seconds')
            };
        }

        // Within burst window and under limit
        return {
            allowed: true,
            newBurstCount: currentBurstCount + 1,
            burstWindowStart: record.burstWindowStart,
            remaining: this.config.burstLimit - (currentBurstCount + 1)
        };
    }

    /**
     * Calculates the number of seconds until midnight UTC for retry-after headers.
     * Used when daily limits are exceeded to tell users when they can try again.
     * @returns {number} Number of seconds until the next day starts (midnight UTC)
     * @private
     */
    private getSecondsUntilMidnight(): number {
        const now = moment.utc();
        const midnight = now.clone().add(1, 'day').startOf('day');
        return midnight.diff(now, 'seconds');
    }

    /**
     * Calculates the number of seconds until the next hour for retry-after headers.
     * Used when hourly limits are exceeded to tell users when they can try again.
     * @returns {number} Number of seconds until the next hour starts
     * @private
     */
    private getSecondsUntilNextHour(): number {
        const now = moment.utc();
        const nextHour = now.clone().add(1, 'hour').startOf('hour');
        return nextHour.diff(now, 'seconds');
    }

    /**
     * Retrieves current usage statistics for an IP address without incrementing any counters.
     * Useful for displaying usage information to users or for monitoring purposes.
     * @param {string} ipAddress - The client's IP address to get usage stats for
     * @returns {Promise<Object>} Promise resolving to current usage statistics
     * @returns {number} returns.hourly - Number of requests made in the current hour
     * @returns {number} returns.daily - Number of requests made today
     * @returns {number} returns.burst - Number of requests made in the current burst window (0 if outside window)
     */
    async getCurrentUsage(ipAddress: string): Promise<{
        hourly: number;
        daily: number;
        burst: number;
    }> {
        const now = moment.utc();
        const dateStr = now.format('YYYY-MM-DD');
        const hourStr = now.format('YYYY-MM-DD-HH');
        const ipId = `IP-${ipAddress}-${dateStr}`;

        try {
            const result = await this.dbClient.send(new GetCommand({
                TableName: tableName,
                Key: { id: ipId }
            }));

            const record = result.Item as RateLimitRecord;
            if (!record) {
                return { hourly: 0, daily: 0, burst: 0 };
            }

            const hourlyUsage = record.hour === hourStr ? record.hourlyCount || 0 : 0;
            const dailyUsage = record.dailyCount || 0;
            
            // Calculate burst usage
            let burstUsage = 0;
            if (record.burstWindowStart) {
                const burstWindowStart = moment.utc(record.burstWindowStart);
                const windowEnd = burstWindowStart.clone().add(this.config.burstWindowMinutes, 'minutes');
                
                if (now.isBefore(windowEnd)) {
                burstUsage = record.burstCount || 0;
                }
            }

            return {
                hourly: hourlyUsage,
                daily: dailyUsage,
                burst: burstUsage
            };

        } catch (error) {
            logger.error('Failed to get current usage', { error, ipAddress });
            return { hourly: 0, daily: 0, burst: 0 };
        }
    }
}