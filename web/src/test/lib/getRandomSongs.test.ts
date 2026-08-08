import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApiGetPublic } = vi.hoisted(() => ({ mockApiGetPublic: vi.fn() }));

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, apiGetPublic: mockApiGetPublic };
});

import { getRandomSongs } from '@/lib/getRandomSongs';

beforeEach(() => { vi.clearAllMocks(); });

describe('getRandomSongs', () => {
    it('returns songs on success', async () => {
        const songs = [{ songKey: 'Guster/Terrified/abc', songName: 'Terrified', artistName: 'Guster' }];
        mockApiGetPublic.mockResolvedValue({ data: { songs }, headers: new Headers() });

        const result = await getRandomSongs('Other/Song/xyz');

        expect(result).toEqual(songs);
        expect(mockApiGetPublic).toHaveBeenCalledWith(
            `/v1/random-songs?excludeSongKey=${encodeURIComponent('Other/Song/xyz')}`
        );
    });

    it('returns empty array on API error', async () => {
        mockApiGetPublic.mockRejectedValue(new Error('network error'));

        const result = await getRandomSongs('Other/Song/xyz');

        expect(result).toEqual([]);
    });
});
