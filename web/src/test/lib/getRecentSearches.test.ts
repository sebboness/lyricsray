import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApiGetPublic } = vi.hoisted(() => ({
    mockApiGetPublic: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
    apiGetPublic: mockApiGetPublic,
}));

import { getRecentSearches } from '@/lib/getRecentSearches';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('getRecentSearches', () => {
    it('requests the recent-searches endpoint with the requested limit', async () => {
        mockApiGetPublic.mockResolvedValue({ data: { songs: [] }, headers: new Headers() });

        await getRecentSearches(25);

        expect(mockApiGetPublic).toHaveBeenCalledWith('/v1/recent-searches?limit=25');
    });

    it('defaults to a limit of 50', async () => {
        mockApiGetPublic.mockResolvedValue({ data: { songs: [] }, headers: new Headers() });

        await getRecentSearches();

        expect(mockApiGetPublic).toHaveBeenCalledWith('/v1/recent-searches?limit=50');
    });

    it('returns the songs from the API response', async () => {
        const songs = [
            { songKey: 'k1', songName: 'Song', artistName: 'Artist', recommendedAge: 13, themes: [], appropriate: 1, date: '2026-07-20T00:00:00.000Z' },
        ];
        mockApiGetPublic.mockResolvedValue({ data: { songs }, headers: new Headers() });

        const result = await getRecentSearches();

        expect(result).toEqual(songs);
    });

    it('returns an empty array when the API call throws', async () => {
        mockApiGetPublic.mockRejectedValue(new Error('boom'));

        const result = await getRecentSearches();

        expect(result).toEqual([]);
    });
});
