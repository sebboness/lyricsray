import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSession, mockGetDailyStats } = vi.hoisted(() => ({
    mockGetSession: vi.fn(),
    mockGetDailyStats: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ getSession: mockGetSession }));
vi.mock('@/storage/dynamodb', () => ({ getDynamoDbClient: vi.fn(() => ({})) }));
vi.mock('@/storage/DailyStatsStorage', () => ({
    DailyStatsStorage: vi.fn().mockImplementation(() => ({
        getDailyStats: mockGetDailyStats,
    })),
}));

import { GET } from '@/app/api/admin/stats/route';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('GET /api/admin/stats', () => {
    it('returns 401 when there is no active session', async () => {
        mockGetSession.mockResolvedValue(null);

        const res = await GET();

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('Unauthorized');
    });

    it('returns stats for the last 30 days when authenticated', async () => {
        mockGetSession.mockResolvedValue({ userId: 'u1', email: 'admin@example.com' });
        const fakeStat = { date: '2026-08-06', totalAnalyses: 10, cacheHits: 3, cacheMisses: 7, totalPageViews: 20, uniqueHashedIps: 8, topSongs: [], uaBreakdown: { bot: 0, searchEngine: 1, aiCrawler: 0, person: 7 }, lastComputedAt: '2026-08-06T06:00:00.000Z' };
        mockGetDailyStats.mockResolvedValue([fakeStat]);

        const res = await GET();

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.stats).toHaveLength(1);
        expect(body.stats[0].date).toBe('2026-08-06');
        expect(mockGetDailyStats).toHaveBeenCalledWith(30);
    });
});
