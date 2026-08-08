import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetArtistAnalyses, mockNotFound, mockPermanentRedirect, mockWriteSongNotFoundEvent } = vi.hoisted(() => ({
    mockGetArtistAnalyses: vi.fn(),
    mockNotFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
    mockPermanentRedirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }),
    mockWriteSongNotFoundEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/navigation', () => ({
    notFound: mockNotFound,
    permanentRedirect: mockPermanentRedirect,
}));

vi.mock('@/lib/getArtistAnalyses', () => ({ getArtistAnalyses: mockGetArtistAnalyses }));

vi.mock('next/headers', () => ({
    headers: vi.fn(() => new Map([['user-agent', 'Mozilla/5.0'], ['x-forwarded-for', '10.0.0.1']])),
}));

vi.mock('@/storage/dynamodb', () => ({ getDynamoDbClient: vi.fn(() => ({})) }));

vi.mock('@/storage/AnalyticsEventStorage', () => ({
    AnalyticsEventStorage: vi.fn().mockImplementation(() => ({
        writeSongNotFoundEvent: mockWriteSongNotFoundEvent,
    })),
}));

vi.mock('@/util/hash', () => ({ hashValue: vi.fn(() => 'hashedip') }));
vi.mock('@/util/userAgent', () => ({ parseUserAgent: vi.fn(() => ({ uaType: 'person' })) }));

import SongLookupPage from '@/app/analysis/[artistName]/[songName]/page';

const makeSong = (songKey = 'Guster/Terrified/abc123') => ({
    songKey,
    songName: 'Terrified',
    artistName: 'Guster',
    recommendedAge: 10,
    themes: [],
    appropriate: 1,
    date: '2026-01-01T00:00:00.000Z',
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe('SongLookupPage', () => {
    it('redirects to the 3-segment URL of the first matching song', async () => {
        mockGetArtistAnalyses.mockResolvedValue([makeSong('Guster/Terrified/abc123')]);

        await expect(
            SongLookupPage({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified' }) }),
        ).rejects.toThrow('NEXT_REDIRECT');

        expect(mockPermanentRedirect).toHaveBeenCalledWith('/analysis/Guster/Terrified/abc123');
    });

    it('calls notFound() when no songs match the artist+song prefix', async () => {
        mockGetArtistAnalyses.mockResolvedValue([]);

        await expect(
            SongLookupPage({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified' }) }),
        ).rejects.toThrow('NEXT_NOT_FOUND');

        expect(mockNotFound).toHaveBeenCalledTimes(1);
    });

    it('fires a songNotFound analytics event before notFound()', async () => {
        mockGetArtistAnalyses.mockResolvedValue([]);

        await expect(
            SongLookupPage({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified' }) }),
        ).rejects.toThrow('NEXT_NOT_FOUND');

        expect(mockWriteSongNotFoundEvent).toHaveBeenCalledWith(
            expect.objectContaining({ songKey: 'Guster/Terrified' }),
        );
    });

    it('retries with %2B replaced by - when no results found', async () => {
        mockGetArtistAnalyses
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([makeSong('Ariana-Grande/34-35/abc123')]);

        await expect(
            SongLookupPage({ params: Promise.resolve({ artistName: 'Ariana-Grande', songName: '34+35' }) }),
        ).rejects.toThrow('NEXT_REDIRECT');

        expect(mockPermanentRedirect).toHaveBeenCalledWith('/analysis/Ariana-Grande/34-35/abc123');
        expect(mockGetArtistAnalyses).toHaveBeenCalledTimes(2);
    });
});
