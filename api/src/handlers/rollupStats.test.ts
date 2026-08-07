import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const { mockSend, mockDynamoDbClient } = vi.hoisted(() => {
    const mockSend = vi.fn();
    return {
        mockSend,
        mockDynamoDbClient: { send: mockSend },
    };
});

vi.mock('../util/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../storage/dynamodb', () => ({
    getDynamoDbClient: vi.fn(() => mockDynamoDbClient),
}));

vi.mock('moment', () => {
    const utcFn = vi.fn().mockReturnValue({
        format: vi.fn((fmt: string) => fmt === 'YYYY-MM-DD' ? '2026-08-06' : '2026-08-06'),
        subtract: vi.fn().mockReturnThis(),
    });
    const momentMock = vi.fn(() => ({ format: vi.fn() }));
    (momentMock as any).utc = utcFn;
    return { default: momentMock };
});

import { rollupStatsHandler } from './rollupStats';

const makeEvent = (overrides: Partial<{
    eventId: string;
    eventType: 'analysis' | 'pageView' | 'share' | 'cta' | 'externalLink';
    date: string; timestamp: string; hashedIp: string; uaType: string;
    cacheHit: boolean; songKey: string; artistName: string; songName: string;
    shareMethod: string; ctaAction: string; linkTarget: string;
}>) => ({
    eventId: 'id-1',
    eventType: 'analysis' as const,
    date: '2026-08-06',
    timestamp: '2026-08-06T10:00:00.000Z',
    hashedIp: 'hash001',
    uaType: 'person',
    browser: 'Chrome',
    os: 'Windows',
    songKey: 'Artist/Song/abc',
    artistName: 'Artist',
    songName: 'Song',
    cacheHit: false,
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
});

describe('rollupStatsHandler', () => {
    it('queries events for yesterday and today and writes stats for both', async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined }) // yesterday query
            .mockResolvedValueOnce({}) // yesterday put
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined }) // today query
            .mockResolvedValueOnce({}); // today put

        await rollupStatsHandler();

        const queryCalls = mockSend.mock.calls.filter((c) => c[0] instanceof QueryCommand);
        const putCalls = mockSend.mock.calls.filter((c) => c[0] instanceof PutCommand);
        expect(queryCalls).toHaveLength(2);
        expect(putCalls).toHaveLength(2);
    });

    it('counts analysis events, cache hits and misses correctly', async () => {
        const events = [
            makeEvent({ cacheHit: true }),
            makeEvent({ cacheHit: false }),
            makeEvent({ cacheHit: false }),
        ];

        // yesterday: no events, today: 3 analysis events
        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({}) // yesterday put
            .mockResolvedValueOnce({ Items: events, LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({}); // today put

        await rollupStatsHandler();

        const todayPut = mockSend.mock.calls
            .filter((c) => c[0] instanceof PutCommand)
            .map((c) => c[0].input.Item)[1];

        expect(todayPut.totalAnalyses).toBe(3);
        expect(todayPut.cacheHits).toBe(1);
        expect(todayPut.cacheMisses).toBe(2);
        expect(todayPut.totalPageViews).toBe(0);
    });

    it('counts page view events separately from analysis events', async () => {
        const events = [
            makeEvent({ eventType: 'pageView' }),
            makeEvent({ eventType: 'pageView' }),
            makeEvent({ eventType: 'analysis', cacheHit: false }),
        ];

        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ Items: events, LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({});

        await rollupStatsHandler();

        const todayPut = mockSend.mock.calls
            .filter((c) => c[0] instanceof PutCommand)
            .map((c) => c[0].input.Item)[1];

        expect(todayPut.totalPageViews).toBe(2);
        expect(todayPut.totalAnalyses).toBe(1);
    });

    it('counts only distinct hashed IPs for uniqueHashedIps', async () => {
        const events = [
            makeEvent({ hashedIp: 'ip001' }),
            makeEvent({ hashedIp: 'ip001' }), // duplicate
            makeEvent({ hashedIp: 'ip002' }),
        ];

        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ Items: events, LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({});

        await rollupStatsHandler();

        const todayPut = mockSend.mock.calls
            .filter((c) => c[0] instanceof PutCommand)
            .map((c) => c[0].input.Item)[1];

        expect(todayPut.uniqueHashedIps).toBe(2);
    });

    it('aggregates UA breakdown counts from pageView events only', async () => {
        const events = [
            makeEvent({ eventType: 'pageView', uaType: 'person' }),
            makeEvent({ eventType: 'pageView', uaType: 'person' }),
            makeEvent({ eventType: 'pageView', uaType: 'aiCrawler' }),
            makeEvent({ eventType: 'analysis', uaType: 'bot' }), // analysis events do NOT count toward uaBreakdown
        ];

        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ Items: events, LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({});

        await rollupStatsHandler();

        const todayPut = mockSend.mock.calls
            .filter((c) => c[0] instanceof PutCommand)
            .map((c) => c[0].input.Item)[1];

        expect(todayPut.uaBreakdown.person).toBe(2);
        expect(todayPut.uaBreakdown.aiCrawler).toBe(1);
        expect(todayPut.uaBreakdown.bot).toBe(0); // analysis event — not counted
        expect(todayPut.uaBreakdown.searchEngine).toBe(0);
    });

    it('aggregates top songs across analysis and pageView events', async () => {
        const events = [
            makeEvent({ songKey: 'A/S1/h', artistName: 'A', songName: 'S1', eventType: 'analysis', cacheHit: false }),
            makeEvent({ songKey: 'A/S1/h', artistName: 'A', songName: 'S1', eventType: 'pageView' }),
            makeEvent({ songKey: 'A/S2/h', artistName: 'A', songName: 'S2', eventType: 'analysis', cacheHit: false }),
        ];

        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ Items: events, LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({});

        await rollupStatsHandler();

        const todayPut = mockSend.mock.calls
            .filter((c) => c[0] instanceof PutCommand)
            .map((c) => c[0].input.Item)[1];

        expect(todayPut.topSongs).toHaveLength(2);
        const s1 = todayPut.topSongs.find((s: { songKey: string }) => s.songKey === 'A/S1/h');
        expect(s1?.analysisCount).toBe(1);
        expect(s1?.pageViewCount).toBe(1);
        expect(s1?.shareCount).toBe(0);
    });

    it('tracks per-song share counts in topSongs', async () => {
        const events = [
            makeEvent({ songKey: 'A/S1/h', artistName: 'A', songName: 'S1', eventType: 'analysis', cacheHit: false }),
            makeEvent({ songKey: 'A/S1/h', artistName: 'A', songName: 'S1', eventType: 'share', shareMethod: 'whatsapp' }),
            makeEvent({ songKey: 'A/S1/h', artistName: 'A', songName: 'S1', eventType: 'share', shareMethod: 'copy' }),
            makeEvent({ songKey: 'A/S2/h', artistName: 'A', songName: 'S2', eventType: 'analysis', cacheHit: false }),
        ];

        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ Items: events, LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({});

        await rollupStatsHandler();

        const todayPut = mockSend.mock.calls
            .filter((c) => c[0] instanceof PutCommand)
            .map((c) => c[0].input.Item)[1];

        const s1 = todayPut.topSongs.find((s: { songKey: string }) => s.songKey === 'A/S1/h');
        expect(s1?.shareCount).toBe(2);
        const s2 = todayPut.topSongs.find((s: { songKey: string }) => s.songKey === 'A/S2/h');
        expect(s2?.shareCount).toBe(0);
    });

    it('counts share events and tallies shareBreakdown by method', async () => {
        const events = [
            makeEvent({ eventType: 'share', shareMethod: 'whatsapp' }),
            makeEvent({ eventType: 'share', shareMethod: 'whatsapp' }),
            makeEvent({ eventType: 'share', shareMethod: 'copy' }),
        ];

        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ Items: events, LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({});

        await rollupStatsHandler();

        const todayPut = mockSend.mock.calls
            .filter((c) => c[0] instanceof PutCommand)
            .map((c) => c[0].input.Item)[1];

        expect(todayPut.totalShares).toBe(3);
        expect(todayPut.shareBreakdown.whatsapp).toBe(2);
        expect(todayPut.shareBreakdown.copy).toBe(1);
        expect(todayPut.shareBreakdown.facebook).toBe(0);
        expect(todayPut.totalAnalyses).toBe(0);
    });

    it('counts CTA clicks and dismissals separately', async () => {
        const events = [
            makeEvent({ eventType: 'cta', ctaAction: 'clicked' }),
            makeEvent({ eventType: 'cta', ctaAction: 'clicked' }),
            makeEvent({ eventType: 'cta', ctaAction: 'dismissed' }),
        ];

        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ Items: events, LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({});

        await rollupStatsHandler();

        const todayPut = mockSend.mock.calls
            .filter((c) => c[0] instanceof PutCommand)
            .map((c) => c[0].input.Item)[1];

        expect(todayPut.totalCtaClicks).toBe(2);
        expect(todayPut.totalCtaDismissals).toBe(1);
    });

    it('counts external link clicks', async () => {
        const events = [
            makeEvent({ eventType: 'externalLink', linkTarget: 'kofi-profile' }),
            makeEvent({ eventType: 'externalLink', linkTarget: 'hexonite' }),
        ];

        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ Items: events, LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({});

        await rollupStatsHandler();

        const todayPut = mockSend.mock.calls
            .filter((c) => c[0] instanceof PutCommand)
            .map((c) => c[0].input.Item)[1];

        expect(todayPut.totalExternalLinkClicks).toBe(2);
    });

    it('builds a 24-slot hourlyBreakdown bucketing pageView and analysis events by UTC hour', async () => {
        const events = [
            makeEvent({ eventType: 'pageView', timestamp: '2026-08-06T09:15:00.000Z' }),
            makeEvent({ eventType: 'pageView', timestamp: '2026-08-06T09:45:00.000Z' }),
            makeEvent({ eventType: 'analysis', cacheHit: false, timestamp: '2026-08-06T09:30:00.000Z' }),
            makeEvent({ eventType: 'pageView', timestamp: '2026-08-06T14:00:00.000Z' }),
        ];

        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ Items: events, LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({});

        await rollupStatsHandler();

        const todayPut = mockSend.mock.calls
            .filter((c) => c[0] instanceof PutCommand)
            .map((c) => c[0].input.Item)[1];

        expect(todayPut.hourlyBreakdown).toHaveLength(24);
        expect(todayPut.hourlyBreakdown[9]).toEqual({ pageViews: 2, analyses: 1 });
        expect(todayPut.hourlyBreakdown[14]).toEqual({ pageViews: 1, analyses: 0 });
        expect(todayPut.hourlyBreakdown[0]).toEqual({ pageViews: 0, analyses: 0 });
    });

    it('aggregates songNotFound events by songKey into notFoundSongKeys sorted by count', async () => {
        const events = [
            makeEvent({ eventType: 'songNotFound', songKey: 'A/S1/h' }),
            makeEvent({ eventType: 'songNotFound', songKey: 'A/S1/h' }),
            makeEvent({ eventType: 'songNotFound', songKey: 'A/S2/h' }),
        ];

        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({ Items: events, LastEvaluatedKey: undefined })
            .mockResolvedValueOnce({});

        await rollupStatsHandler();

        const todayPut = mockSend.mock.calls
            .filter((c) => c[0] instanceof PutCommand)
            .map((c) => c[0].input.Item)[1];

        expect(todayPut.notFoundSongKeys).toHaveLength(2);
        expect(todayPut.notFoundSongKeys[0]).toEqual({ songKey: 'A/S1/h', count: 2 });
        expect(todayPut.notFoundSongKeys[1]).toEqual({ songKey: 'A/S2/h', count: 1 });
        expect(todayPut.totalAnalyses).toBe(0);
    });

    it('continues to process today if yesterday fails', async () => {
        mockSend
            .mockRejectedValueOnce(new Error('query failed')) // yesterday query
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined }) // today query
            .mockResolvedValueOnce({}); // today put

        await expect(rollupStatsHandler()).resolves.not.toThrow();

        const putCalls = mockSend.mock.calls.filter((c) => c[0] instanceof PutCommand);
        expect(putCalls).toHaveLength(1);
    });

    it('paginates through multiple pages of query results', async () => {
        const page1Events = [makeEvent({ hashedIp: 'ip001', cacheHit: true })];
        const page2Events = [makeEvent({ hashedIp: 'ip002', cacheHit: false })];

        mockSend
            .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined }) // yesterday
            .mockResolvedValueOnce({}) // yesterday put
            .mockResolvedValueOnce({ Items: page1Events, LastEvaluatedKey: { eventId: 'cursor' } }) // today page 1
            .mockResolvedValueOnce({ Items: page2Events, LastEvaluatedKey: undefined }) // today page 2
            .mockResolvedValueOnce({}); // today put

        await rollupStatsHandler();

        const todayPut = mockSend.mock.calls
            .filter((c) => c[0] instanceof PutCommand)
            .map((c) => c[0].input.Item)[1];

        expect(todayPut.totalAnalyses).toBe(2);
        expect(todayPut.uniqueHashedIps).toBe(2);
    });
});
