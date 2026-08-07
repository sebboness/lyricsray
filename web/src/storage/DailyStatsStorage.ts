import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '@/logger/logger';

const tableName = `${process.env.APP_NAME?.toLowerCase()}-${process.env.ENV?.toLowerCase()}-daily-stats`;

export interface TopSong {
    songKey: string;
    artistName: string;
    songName: string;
    analysisCount: number;
    pageViewCount: number;
    shareCount?: number;
}

export interface UaBreakdown {
    bot: number;
    searchEngine: number;
    aiCrawler: number;
    person: number;
}

export interface ShareBreakdown {
    whatsapp: number;
    facebook: number;
    twitter: number;
    email: number;
    copy: number;
}

export interface DailyStat {
    date: string;
    totalAnalyses: number;
    cacheHits: number;
    cacheMisses: number;
    totalPageViews: number;
    uniqueHashedIps: number;
    topSongs: TopSong[];
    uaBreakdown: UaBreakdown;
    lastComputedAt: string;
    totalShares?: number;
    shareBreakdown?: ShareBreakdown;
    totalCtaClicks?: number;
    totalCtaDismissals?: number;
    totalExternalLinkClicks?: number;
    notFoundSongKeys?: { songKey: string; count: number }[];
}

export class DailyStatsStorage {
    constructor(private readonly dbClient: DynamoDBDocumentClient) {}

    /** Returns daily stats for the last `days` days, sorted newest first. */
    async getDailyStats(days: number = 30): Promise<DailyStat[]> {
        try {
            const cutoff = new Date();
            cutoff.setUTCDate(cutoff.getUTCDate() - days);
            const cutoffDate = cutoff.toISOString().split('T')[0];

            const { Items } = await this.dbClient.send(new ScanCommand({
                TableName: tableName,
                FilterExpression: '#d >= :cutoff',
                ExpressionAttributeNames: { '#d': 'date' },
                ExpressionAttributeValues: { ':cutoff': cutoffDate },
            }));

            const stats = (Items as DailyStat[]) ?? [];
            return stats.sort((a, b) => b.date.localeCompare(a.date));
        } catch (err) {
            logger.error('Failed to get daily stats', { err });
            return [];
        }
    }
}
