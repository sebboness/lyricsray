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
    it('requests the recent-searches endpoint with the default limit and no cursor', async () => {
        mockApiGetPublic.mockResolvedValue({ data: { songs: [] }, headers: new Headers() });

        await getRecentSearches();

        expect(mockApiGetPublic).toHaveBeenCalledWith('/v1/recent-searches?limit=50');
    });

    it('includes the cursor when one is given', async () => {
        mockApiGetPublic.mockResolvedValue({ data: { songs: [] }, headers: new Headers() });

        await getRecentSearches('abc123');

        expect(mockApiGetPublic).toHaveBeenCalledWith('/v1/recent-searches?limit=50&cursor=abc123');
    });

    it('respects a custom limit', async () => {
        mockApiGetPublic.mockResolvedValue({ data: { songs: [] }, headers: new Headers() });

        await getRecentSearches(undefined, 25);

        expect(mockApiGetPublic).toHaveBeenCalledWith('/v1/recent-searches?limit=25');
    });

    it('returns the songs and nextCursor from the API response', async () => {
        const songs = [
            { songKey: 'k1', songName: 'Song', artistName: 'Artist', recommendedAge: 13, themes: [], appropriate: 1, date: '2026-07-20T00:00:00.000Z' },
        ];
        mockApiGetPublic.mockResolvedValue({ data: { songs, nextCursor: 'next-token' }, headers: new Headers() });

        const result = await getRecentSearches();

        expect(result).toEqual({ songs, nextCursor: 'next-token' });
    });

    it('returns no songs and no cursor when the API call throws', async () => {
        mockApiGetPublic.mockRejectedValue(new Error('boom'));

        const result = await getRecentSearches();

        expect(result).toEqual({ songs: [] });
    });
});
