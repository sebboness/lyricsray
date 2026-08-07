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
    eventType: 'analysis' | 'pageView' | 'share' | 'cta' | 'externalLink' | 'songNotFound';
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
    shareMethod?: 'whatsapp' | 'facebook' | 'twitter' | 'email' | 'copy';
    ctaAction?: 'clicked' | 'dismissed';
    linkTarget?: string;
}

interface SongCounts {
    artistName: string;
    songName: string;
    analysisCount: number;
    pageViewCount: number;
    shareCount: number;
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
    let totalShares = 0;
    let totalCtaClicks = 0;
    let totalCtaDismissals = 0;
    let totalExternalLinkClicks = 0;
    const shareBreakdown = { whatsapp: 0, facebook: 0, twitter: 0, email: 0, copy: 0 };
    const externalLinkBreakdown = { 'kofi-profile': 0, hexonite: 0 };
    const uaBreakdown = { bot: 0, searchEngine: 0, aiCrawler: 0, person: 0 };
    const uniqueIps = new Set<string>();
    const songMap = new Map<string, SongCounts>();
    const notFoundMap = new Map<string, number>();
    const hourlyBreakdown = Array.from({ length: 24 }, () => ({ pageViews: 0, analyses: 0 }));

    for (const event of events) {
        if (event.hashedIp) uniqueIps.add(event.hashedIp);

        const hour = parseInt(event.timestamp.slice(11, 13), 10);
        if (event.eventType === 'analysis') {
            totalAnalyses++;
            if (event.cacheHit) cacheHits++; else cacheMisses++;
            if (hour >= 0 && hour < 24) hourlyBreakdown[hour].analyses++;
        } else if (event.eventType === 'pageView') {
            totalPageViews++;
            if (event.uaType && event.uaType in uaBreakdown) uaBreakdown[event.uaType]++;
            if (hour >= 0 && hour < 24) hourlyBreakdown[hour].pageViews++;
        } else if (event.eventType === 'share') {
            totalShares++;
            if (event.shareMethod && event.shareMethod in shareBreakdown) shareBreakdown[event.shareMethod]++;
        } else if (event.eventType === 'cta') {
            if (event.ctaAction === 'clicked') totalCtaClicks++;
            else if (event.ctaAction === 'dismissed') totalCtaDismissals++;
        } else if (event.eventType === 'externalLink') {
            totalExternalLinkClicks++;
            if (event.linkTarget && event.linkTarget in externalLinkBreakdown) {
                externalLinkBreakdown[event.linkTarget as keyof typeof externalLinkBreakdown]++;
            }
        } else if (event.eventType === 'songNotFound' && event.songKey) {
            notFoundMap.set(event.songKey, (notFoundMap.get(event.songKey) ?? 0) + 1);
        }

        if (event.songKey) {
            const existing = songMap.get(event.songKey) ?? {
                artistName: event.artistName ?? '',
                songName: event.songName ?? '',
                analysisCount: 0,
                pageViewCount: 0,
                shareCount: 0,
            };
            if (event.eventType === 'analysis') existing.analysisCount++;
            else if (event.eventType === 'pageView') existing.pageViewCount++;
            else if (event.eventType === 'share') existing.shareCount++;
            songMap.set(event.songKey, existing);
        }
    }

    const topSongs = Array.from(songMap.entries())
        .map(([songKey, counts]) => ({ songKey, ...counts }))
        .sort((a, b) => (b.analysisCount + b.pageViewCount) - (a.analysisCount + a.pageViewCount))
        .slice(0, 20);

    const notFoundSongKeys = Array.from(notFoundMap.entries())
        .map(([songKey, count]) => ({ songKey, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

    await dbClient.send(new PutCommand({
        TableName: statsTable,
        Item: {
            date,
            totalAnalyses,
            cacheHits,
            cacheMisses,
            totalPageViews,
            totalShares,
            shareBreakdown,
            totalCtaClicks,
            totalCtaDismissals,
            totalExternalLinkClicks,
            externalLinkBreakdown,
            uniqueHashedIps: uniqueIps.size,
            topSongs,
            notFoundSongKeys,
            hourlyBreakdown,
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
