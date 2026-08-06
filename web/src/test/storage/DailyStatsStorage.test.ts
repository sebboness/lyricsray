import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DailyStatsStorage } from '@/storage/DailyStatsStorage';

vi.mock('@/logger/logger', () => ({
    logger: { error: vi.fn(), info: vi.fn() },
}));

function makeStat(date: string) {
    return {
        date,
        totalAnalyses: 5,
        cacheHits: 2,
        cacheMisses: 3,
        totalPageViews: 10,
        uniqueHashedIps: 4,
        topSongs: [],
        uaBreakdown: { bot: 0, searchEngine: 1, aiCrawler: 0, person: 4 },
        lastComputedAt: `${date}T06:00:00.000Z`,
    };
}

describe('DailyStatsStorage', () => {
    let mockSend: ReturnType<typeof vi.fn>;
    let storage: DailyStatsStorage;

    beforeEach(() => {
        mockSend = vi.fn();
        storage = new DailyStatsStorage({ send: mockSend } as any);
    });

    it('sends a ScanCommand and returns items sorted newest first', async () => {
        const items = [makeStat('2026-08-04'), makeStat('2026-08-06'), makeStat('2026-08-05')];
        mockSend.mockResolvedValue({ Items: items });

        const result = await storage.getDailyStats(30);

        expect(mockSend.mock.calls[0][0]).toBeInstanceOf(ScanCommand);
        expect(result.map((s) => s.date)).toEqual(['2026-08-06', '2026-08-05', '2026-08-04']);
    });

    it('returns an empty array when the scan returns no items', async () => {
        mockSend.mockResolvedValue({ Items: [] });

        const result = await storage.getDailyStats(30);

        expect(result).toEqual([]);
    });

    it('returns an empty array and does not throw when the DynamoDB call fails', async () => {
        mockSend.mockRejectedValue(new Error('ddb down'));

        const result = await storage.getDailyStats(30);

        expect(result).toEqual([]);
    });

    it('passes a cutoff date filter expression', async () => {
        mockSend.mockResolvedValue({ Items: [] });

        await storage.getDailyStats(7);

        const cmd = mockSend.mock.calls[0][0];
        expect(cmd.input.FilterExpression).toContain('>= :cutoff');
        expect(cmd.input.ExpressionAttributeValues[':cutoff']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
