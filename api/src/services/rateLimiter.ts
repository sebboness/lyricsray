import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import moment from 'moment';
import { getDefaultRateLimitConfig, RateLimitConfig } from '../config/rateLimitConfig';
import { logger } from '../util/logger';
import { hashIp } from '../util/hash';

const tableName = `${process.env.APP_NAME!.toLowerCase()}-${process.env.ENV?.toLowerCase()}-analysis-rate-limits`;

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
  private readonly config: RateLimitConfig;

  /**
   * Creates a new RateLimiter instance with atomic operations for concurrency safety.
   * @param dbClient The DynamoDB client instance
   * @param config Optional configuration overrides for rate limits
   */
  constructor(
    private readonly dbClient: DynamoDBDocumentClient,
    config?: Partial<RateLimitConfig>,
  ) {
    this.config = { ...getDefaultRateLimitConfig(), ...config };
  }

  /**
   * Atomically checks all rate limits and increments counters if allowed.
   * This is the main method that prevents race conditions by combining check + increment operations.
   * @param ipAddress The client's IP address to check rate limits for
   */
  async checkAndIncrementRateLimit(ipAddress: string): Promise<RateLimitResult> {
    const hashedIp = hashIp(ipAddress);
    const now = moment.utc();
    const dateStr = now.format('YYYY-MM-DD');
    const hourStr = now.format('YYYY-MM-DD-HH');
    const globalId = `GLOBAL-${dateStr}`;
    const ipId = `IP-${hashedIp}-${dateStr}`;
    const ttl = moment.utc().add(2, 'days').unix();
    let currentRecord: RateLimitRecord | undefined = undefined;

    try {
      // Get current IP record to handle complex burst logic
      currentRecord = await this.getCurrentRecord(ipId);

      // Check burst limits before attempting transaction
      const burstState = this.calculateBurstState(currentRecord, now);
      if (!burstState.allowed) {
        return {
          allowed: false,
          reason: burstState.reason,
          retryAfter: burstState.retryAfter,
          remaining: { hourly: 0, daily: 0, burst: burstState.remaining },
        };
      }

      const isNewHour = !currentRecord || currentRecord.hour !== hourStr;
      const newHourlyCount = isNewHour ? 1 : (currentRecord?.hourlyCount || 0) + 1;
      const newDailyCount = (currentRecord?.dailyCount || 0) + 1;

      const ipExpressionValues: Record<string, any> = {
        ':dailyInc': 1,
        ':date': dateStr,
        ':hour': hourStr,
        ':ttl': ttl,
        ':burstCount': burstState.newBurstCount,
        ':burstWindowStart': burstState.burstWindowStart,
        ':dailyLimit': this.config.dailyLimit,
        ':hourlyLimit': this.config.hourlyLimit,
      };

      // Only add :hourlyCount when setting it (new hour)
      if (isNewHour) {
        ipExpressionValues[':hourlyCount'] = newHourlyCount;
      }

      // Execute atomic transaction - both global and IP counters update or both fail.
      // Requires dynamodb:TransactWriteItems on the IAM role, not just PutItem/UpdateItem.
      await this.dbClient.send(new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: tableName,
              Key: { id: globalId },
              UpdateExpression: 'ADD dailyCount :inc SET #date = :date, #ttl = :ttl',
              ConditionExpression: 'dailyCount < :globalLimit OR attribute_not_exists(dailyCount)',
              ExpressionAttributeNames: { '#date': 'date', '#ttl': 'ttl' },
              ExpressionAttributeValues: {
                ':inc': 1,
                ':date': dateStr,
                ':ttl': ttl,
                ':globalLimit': this.config.globalDailyLimit,
              },
            },
          },
          {
            Update: {
              TableName: tableName,
              Key: { id: ipId },
              UpdateExpression: this.buildIpUpdateExpression(isNewHour),
              ConditionExpression: this.buildIpConditionExpression(),
              ExpressionAttributeNames: { '#date': 'date', '#hour': 'hour', '#ttl': 'ttl' },
              ExpressionAttributeValues: ipExpressionValues,
            },
          },
        ],
      }));

      logger.info('rate limit transaction succeeded', {
        hashedIp,
        globalId,
        ipId,
        newDailyCount,
        newHourlyCount,
      });

      return {
        allowed: true,
        remaining: {
          hourly: Math.max(0, this.config.hourlyLimit - newHourlyCount),
          daily: Math.max(0, this.config.dailyLimit - newDailyCount),
          burst: Math.max(0, this.config.burstLimit - burstState.newBurstCount),
        },
      };
    } catch (error) {
      return this.handleTransactionError(error, hashedIp, currentRecord, hourStr);
    }
  }

  /**
   * Gets the current record for an IP address without incrementing counters.
   */
  private async getCurrentRecord(ipId: string): Promise<RateLimitRecord | undefined> {
    try {
      const result = await this.dbClient.send(new GetCommand({ TableName: tableName, Key: { id: ipId } }));
      return result.Item as RateLimitRecord;
    } catch (error) {
      logger.warn('failed to get current record', { error, ipId });
      return undefined;
    }
  }

  private buildIpUpdateExpression(isNewHour: boolean): string {
    return isNewHour
      ? 'SET hourlyCount = :hourlyCount, #date = :date, #hour = :hour, #ttl = :ttl, burstCount = :burstCount, burstWindowStart = :burstWindowStart ADD dailyCount :dailyInc'
      : 'ADD hourlyCount :dailyInc, dailyCount :dailyInc SET #date = :date, #hour = :hour, #ttl = :ttl, burstCount = :burstCount, burstWindowStart = :burstWindowStart';
  }

  private buildIpConditionExpression(): string {
    return [
      '(attribute_not_exists(dailyCount) OR dailyCount < :dailyLimit)',
      '(attribute_not_exists(hourlyCount) OR hourlyCount < :hourlyLimit)',
    ].join(' AND ');
  }

  private handleTransactionError(
    error: any,
    hashedIp: string,
    currentRecord: RateLimitRecord | undefined,
    hourStr: string,
  ): RateLimitResult {
    if (error instanceof TransactionCanceledException) {
      logger.warn('rate limit transaction cancelled - limits exceeded', { hashedIp, hourStr, currentRecord });

      const currentHourlyCount = currentRecord?.hour === hourStr ? currentRecord.hourlyCount : 0;
      const currentDailyCount = currentRecord?.dailyCount || 0;

      if (currentDailyCount >= this.config.dailyLimit) {
        return {
          allowed: false,
          reason: 'Daily limit exceeded. Please try again tomorrow.',
          retryAfter: this.getSecondsUntilMidnight(),
          remaining: { hourly: 0, daily: 0, burst: 0 },
        };
      }

      if (currentHourlyCount >= this.config.hourlyLimit) {
        return {
          allowed: false,
          reason: 'Hourly limit exceeded. Please wait before trying again.',
          retryAfter: this.getSecondsUntilNextHour(),
          remaining: { hourly: 0, daily: Math.max(0, this.config.dailyLimit - currentDailyCount), burst: 0 },
        };
      }

      return {
        allowed: false,
        reason: 'Service capacity exceeded. Please try again tomorrow.',
        retryAfter: this.getSecondsUntilMidnight(),
        remaining: { hourly: 0, daily: 0, burst: 0 },
      };
    }

    // Other errors - log and fail open for availability
    logger.error('rate limit transaction failed with unexpected error', { error, hashedIp });

    return {
      allowed: true,
      remaining: { hourly: this.config.hourlyLimit, daily: this.config.dailyLimit, burst: this.config.burstLimit },
    };
  }

  private calculateBurstState(
    record: RateLimitRecord | undefined,
    now: moment.Moment,
  ): { allowed: boolean; newBurstCount: number; burstWindowStart: string; remaining: number; reason?: string; retryAfter?: number } {
    if (!record?.burstWindowStart) {
      return { allowed: true, newBurstCount: 1, burstWindowStart: now.toISOString(), remaining: this.config.burstLimit - 1 };
    }

    const burstWindowStart = moment.utc(record.burstWindowStart);
    const windowEnd = burstWindowStart.clone().add(this.config.burstWindowMinutes, 'minutes');

    if (now.isAfter(windowEnd)) {
      return { allowed: true, newBurstCount: 1, burstWindowStart: now.toISOString(), remaining: this.config.burstLimit - 1 };
    }

    const currentBurstCount = record.burstCount || 0;
    if (currentBurstCount >= this.config.burstLimit) {
      return {
        allowed: false,
        newBurstCount: currentBurstCount,
        burstWindowStart: record.burstWindowStart,
        remaining: 0,
        reason: `Rate limit exceeded. Please wait ${windowEnd.diff(now, 'minutes')} minutes before trying again.`,
        retryAfter: windowEnd.diff(now, 'seconds'),
      };
    }

    return {
      allowed: true,
      newBurstCount: currentBurstCount + 1,
      burstWindowStart: record.burstWindowStart,
      remaining: this.config.burstLimit - (currentBurstCount + 1),
    };
  }

  private getSecondsUntilMidnight(): number {
    const now = moment.utc();
    return now.clone().add(1, 'day').startOf('day').diff(now, 'seconds');
  }

  private getSecondsUntilNextHour(): number {
    const now = moment.utc();
    return now.clone().add(1, 'hour').startOf('hour').diff(now, 'seconds');
  }
}
