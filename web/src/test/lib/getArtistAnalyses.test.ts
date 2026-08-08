import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApiGetPublic } = vi.hoisted(() => ({ mockApiGetPublic: vi.fn() }));

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, apiGetPublic: mockApiGetPublic };
});

import { getArtistAnalyses } from '@/lib/getArtistAnalyses';

beforeEach(() => { vi.clearAllMocks(); });

describe('getArtistAnalyses', () => {
    it('returns songs on success', async () => {
        const songs = [{ songKey: 'Guster/Terrified/abc', songName: 'Terrified', artistName: 'Guster' }];
        mockApiGetPublic.mockResolvedValue({ data: { songs }, headers: new Headers() });

        const result = await getArtistAnalyses('Guster');

        expect(result).toEqual(songs);
        expect(mockApiGetPublic).toHaveBeenCalledWith('/v1/artist-analyses?artistKey=Guster');
    });

    it('URL-encodes the artistKey', async () => {
        mockApiGetPublic.mockResolvedValue({ data: { songs: [] }, headers: new Headers() });

        await getArtistAnalyses('Ariana-Grande/34%2B35');

        expect(mockApiGetPublic).toHaveBeenCalledWith(
            `/v1/artist-analyses?artistKey=${encodeURIComponent('Ariana-Grande/34%2B35')}`
        );
    });

    it('returns empty array on API error', async () => {
        mockApiGetPublic.mockRejectedValue(new Error('network error'));

        const result = await getArtistAnalyses('Guster');

        expect(result).toEqual([]);
    });
});
