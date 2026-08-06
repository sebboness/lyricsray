import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import moment from 'moment';
import { getDynamoDbClient } from '../storage/dynamodb';
import { logger } from '../util/logger';

const appName = process.env.APP_NAME?.toLowerCase() ?? 'lyricsray';
const env = process.env.ENV?.toLowerCase() ?? 'dev';
const eventsTable = `${appName}-${env}-analytics-events`;
const statsTable = `${appName}-${env}-daily-stats`;

interface RawEvent {
    eventId: string;
    eventType: 'analysis' | 'pageView';
    date: string;
    timestamp: string;
    songKey?: string;
    artistName?: string;
    songName?: string;
    hashedIp?: string;
    uaType?: 'bot' | 'searchEngine' | 'aiCrawler' | 'person';
    browser?: string;
    os?: string;
    cacheHit?: boolean;
}

interface SongCounts {
    artistName: string;
    songName: string;
    analysisCount: number;
    pageViewCount: number;
}

async function fetchEventsForDate(dbClient: DynamoDBDocumentClient, date: string): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
        const { Items, LastEvaluatedKey } = await dbClient.send(new QueryCommand({
            TableName: eventsTable,
            IndexName: 'AnalyticsEventsByDate',
            KeyConditionExpression: '#d = :date',
            ExpressionAttributeNames: { '#d': 'date' },
            ExpressionAttributeValues: { ':date': date },
            ExclusiveStartKey: lastKey,
        }));

        if (Items) events.push(...(Items as RawEvent[]));
        lastKey = LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    return events;
}

async function computeAndStoreStats(dbClient: DynamoDBDocumentClient, date: string): Promise<void> {
    const events = await fetchEventsForDate(dbClient, date);
    logger.info(`rollup: processing ${events.length} events for ${date}`);

    let totalAnalyses = 0;
    let cacheHits = 0;
    let cacheMisses = 0;
    let totalPageViews = 0;
    const uaBreakdown = { bot: 0, searchEngine: 0, aiCrawler: 0, person: 0 };
    const uniqueIps = new Set<string>();
    const songMap = new Map<string, SongCounts>();

    for (const event of events) {
        if (event.hashedIp) uniqueIps.add(event.hashedIp);
        if (event.uaType && event.uaType in uaBreakdown) uaBreakdown[event.uaType]++;

        if (event.eventType === 'analysis') {
            totalAnalyses++;
            if (event.cacheHit) cacheHits++; else cacheMisses++;
        } else if (event.eventType === 'pageView') {
            totalPageViews++;
        }

        if (event.songKey) {
            const existing = songMap.get(event.songKey) ?? {
                artistName: event.artistName ?? '',
                songName: event.songName ?? '',
                analysisCount: 0,
                pageViewCount: 0,
            };
            if (event.eventType === 'analysis') existing.analysisCount++;
            else if (event.eventType === 'pageView') existing.pageViewCount++;
            songMap.set(event.songKey, existing);
        }
    }

    const topSongs = Array.from(songMap.entries())
        .map(([songKey, counts]) => ({ songKey, ...counts }))
        .sort((a, b) => (b.analysisCount + b.pageViewCount) - (a.analysisCount + a.pageViewCount))
        .slice(0, 20);

    await dbClient.send(new PutCommand({
        TableName: statsTable,
        Item: {
            date,
            totalAnalyses,
            cacheHits,
            cacheMisses,
            totalPageViews,
            uniqueHashedIps: uniqueIps.size,
            topSongs,
            uaBreakdown,
            lastComputedAt: new Date().toISOString(),
        },
    }));

    logger.info(`rollup: stored stats for ${date}`, { totalAnalyses, cacheHits, cacheMisses, totalPageViews, uniqueHashedIps: uniqueIps.size });
}

export async function rollupStatsHandler(): Promise<void> {
    const dbClient = getDynamoDbClient();
    const today = moment.utc().format('YYYY-MM-DD');
    const yesterday = moment.utc().subtract(1, 'day').format('YYYY-MM-DD');

    for (const date of [yesterday, today]) {
        try {
            await computeAndStoreStats(dbClient, date);
        } catch (err) {
            logger.error(`rollup: failed to process ${date}`, { err });
        }
    }
}
