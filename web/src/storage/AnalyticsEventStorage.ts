import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { UaType } from '@/util/userAgent';
import { logger } from '@/logger/logger';

const tableName = `${process.env.APP_NAME?.toLowerCase()}-${process.env.ENV?.toLowerCase()}-analytics-events`;

export type AnalyticsEventType = 'analysis' | 'pageView' | 'share' | 'cta' | 'externalLink' | 'songNotFound';

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

export type ShareMethod = 'whatsapp' | 'facebook' | 'twitter' | 'email' | 'copy';
export type CtaAction = 'clicked' | 'dismissed';
export type LinkTarget = 'kofi-profile' | 'hexonite';

export interface ShareEventParams extends BaseEvent {
    shareMethod: ShareMethod;
    songKey: string;
    songName?: string;
    artistName?: string;
}

export interface CtaEventParams extends BaseEvent {
    ctaAction: CtaAction;
    ctaType: 'kofi';
}

export interface ExternalLinkEventParams extends BaseEvent {
    linkTarget: LinkTarget;
    linkContext: string;
}

export interface SongNotFoundEventParams extends BaseEvent {
    songKey: string;
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

    async writeShareEvent(params: ShareEventParams): Promise<void> {
        try {
            await this.dbClient.send(new PutCommand({
                TableName: tableName,
                Item: {
                    eventId: crypto.randomUUID(),
                    eventType: 'share' as AnalyticsEventType,
                    ttl: ttlInSeconds(60),
                    ...params,
                },
            }));
        } catch (err) {
            logger.error('Failed to write share analytics event', { err });
        }
    }

    async writeCtaEvent(params: CtaEventParams): Promise<void> {
        try {
            await this.dbClient.send(new PutCommand({
                TableName: tableName,
                Item: {
                    eventId: crypto.randomUUID(),
                    eventType: 'cta' as AnalyticsEventType,
                    ttl: ttlInSeconds(60),
                    ...params,
                },
            }));
        } catch (err) {
            logger.error('Failed to write CTA analytics event', { err });
        }
    }

    async writeLinkEvent(params: ExternalLinkEventParams): Promise<void> {
        try {
            await this.dbClient.send(new PutCommand({
                TableName: tableName,
                Item: {
                    eventId: crypto.randomUUID(),
                    eventType: 'externalLink' as AnalyticsEventType,
                    ttl: ttlInSeconds(60),
                    ...params,
                },
            }));
        } catch (err) {
            logger.error('Failed to write external link analytics event', { err });
        }
    }

    async writeSongNotFoundEvent(params: SongNotFoundEventParams): Promise<void> {
        try {
            await this.dbClient.send(new PutCommand({
                TableName: tableName,
                Item: {
                    eventId: crypto.randomUUID(),
                    eventType: 'songNotFound' as AnalyticsEventType,
                    ttl: ttlInSeconds(60),
                    ...params,
                },
            }));
        } catch (err) {
            logger.error('Failed to write song not found analytics event', { err });
        }
    }
}
