import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRecentSearches } from '@/lib/getRecentSearches';
import { AnalysisResultStorage } from '@/storage/AnalysisResultStorage';

vi.mock('@/storage/dynamodb', () => ({
    getDynamoDbClient: vi.fn(() => ({})),
}));

vi.mock('@/storage/AnalysisResultStorage', () => ({
    AnalysisResultStorage: vi.fn(),
}));

describe('getRecentSearches', () => {
    const getRecentAnalyses = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (AnalysisResultStorage as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
            getRecentAnalyses,
        }));
    });

    it('always fetches the last 100 analyses regardless of the requested display count', async () => {
        getRecentAnalyses.mockResolvedValue([]);

        await getRecentSearches(50);

        expect(getRecentAnalyses).toHaveBeenCalledWith(100, 'ANALYSIS');
    });

    it('defaults to displaying 50 results', async () => {
        getRecentAnalyses.mockResolvedValue(
            Array.from({ length: 80 }, (_, i) => ({
                songKey: `key-${i}`,
                date: '2026-07-20T00:00:00.000Z',
                recommendedAge: 13,
                themes: [],
                appropriate: 1,
                song: { songName: `Song ${i}`, artistName: `Artist ${i}` },
            }))
        );

        const result = await getRecentSearches();

        expect(result).toHaveLength(50);
    });

    it('excludes analyses submitted via raw lyrics (no song/artist name) before applying the display limit', async () => {
        getRecentAnalyses.mockResolvedValue([
            {
                songKey: 'lyrics-only',
                date: '2026-07-20T00:00:00.000Z',
                recommendedAge: 13,
                themes: [],
                appropriate: 1,
                song: { songName: undefined, artistName: undefined },
            },
            {
                songKey: 'searched-song',
                date: '2026-07-20T00:00:00.000Z',
                recommendedAge: 13,
                themes: [],
                appropriate: 1,
                song: { songName: 'Song', artistName: 'Artist' },
            },
        ]);

        const result = await getRecentSearches();

        expect(result).toEqual([
            {
                songKey: 'searched-song',
                songName: 'Song',
                artistName: 'Artist',
                recommendedAge: 13,
                themes: [],
                appropriate: 1,
                date: '2026-07-20T00:00:00.000Z',
            },
        ]);
    });

    it('maps analysis results into RecentSearchItem shape', async () => {
        getRecentAnalyses.mockResolvedValue([
            {
                songKey: 'artist/song/abc123',
                date: '2026-07-20T00:00:00.000Z',
                recommendedAge: 13,
                themes: ['violence'],
                appropriate: 2,
                song: { songName: 'Song', artistName: 'Artist' },
            },
        ]);

        const result = await getRecentSearches();

        expect(result).toEqual([
            {
                songKey: 'artist/song/abc123',
                songName: 'Song',
                artistName: 'Artist',
                recommendedAge: 13,
                themes: ['violence'],
                appropriate: 2,
                date: '2026-07-20T00:00:00.000Z',
            },
        ]);
    });

    it('filters out incomplete items', async () => {
        getRecentAnalyses.mockResolvedValue([
            {
                songKey: 'incomplete',
                date: '2026-07-20T00:00:00.000Z',
                recommendedAge: 13,
                themes: [],
                appropriate: 1,
                song: { songName: '', artistName: 'Artist' },
            },
        ]);

        const result = await getRecentSearches();

        expect(result).toEqual([]);
    });

    it('returns an empty array when no results are found', async () => {
        getRecentAnalyses.mockResolvedValue([]);

        const result = await getRecentSearches();

        expect(result).toEqual([]);
    });

    it('returns an empty array when the query throws', async () => {
        getRecentAnalyses.mockRejectedValue(new Error('boom'));

        const result = await getRecentSearches();

        expect(result).toEqual([]);
    });
});
