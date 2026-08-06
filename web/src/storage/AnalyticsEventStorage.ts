import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { UaType } from '@/util/userAgent';
import { logger } from '@/logger/logger';

const tableName = `${process.env.APP_NAME?.toLowerCase()}-${process.env.ENV?.toLowerCase()}-analytics-events`;

export type AnalyticsEventType = 'analysis' | 'pageView';

interface BaseEvent {
    date: string;
    timestamp: string;
    hashedIp: string;
    uaType: UaType;
    browser: string;
    os: string;
}

export interface AnalysisEventParams extends BaseEvent {
    songKey: string;
    artistName: string;
    songName: string;
    cacheHit: boolean;
}

export interface PageViewEventParams extends BaseEvent {
    songKey: string;
    artistName: string;
    songName: string;
}

function ttlInSeconds(days: number): number {
    return Math.floor(Date.now() / 1000) + days * 86400;
}

export class AnalyticsEventStorage {
    constructor(private readonly dbClient: DynamoDBDocumentClient) {}

    async writeAnalysisEvent(params: AnalysisEventParams): Promise<void> {
        try {
            await this.dbClient.send(new PutCommand({
                TableName: tableName,
                Item: {
                    eventId: crypto.randomUUID(),
                    eventType: 'analysis' as AnalyticsEventType,
                    ttl: ttlInSeconds(60),
                    ...params,
                },
            }));
        } catch (err) {
            logger.error('Failed to write analysis analytics event', { err });
        }
    }

    async writePageViewEvent(params: PageViewEventParams): Promise<void> {
        try {
            await this.dbClient.send(new PutCommand({
                TableName: tableName,
                Item: {
                    eventId: crypto.randomUUID(),
                    eventType: 'pageView' as AnalyticsEventType,
                    ttl: ttlInSeconds(60),
                    ...params,
                },
            }));
        } catch (err) {
            logger.error('Failed to write page view analytics event', { err });
        }
    }
}
