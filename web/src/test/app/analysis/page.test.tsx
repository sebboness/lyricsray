import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const {
    mockApiGetPublic,
    mockNotFound,
    mockPermanentRedirect,
    mockWritePageViewEvent,
    mockWriteSongNotFoundEvent,
    mockGetRandomSongs,
} = vi.hoisted(() => ({
    mockApiGetPublic: vi.fn(),
    mockNotFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
    mockPermanentRedirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }),
    mockWritePageViewEvent: vi.fn().mockResolvedValue(undefined),
    mockWriteSongNotFoundEvent: vi.fn().mockResolvedValue(undefined),
    mockGetRandomSongs: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/logger/logger', () => ({
    logger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('next/navigation', () => ({
    notFound: mockNotFound,
    permanentRedirect: mockPermanentRedirect,
}));

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, apiGetPublic: mockApiGetPublic };
});

vi.mock('next/headers', () => ({
    headers: vi.fn(() => new Map([['user-agent', 'Mozilla/5.0 Chrome'], ['x-forwarded-for', '10.0.0.1']])),
}));

vi.mock('@/storage/dynamodb', () => ({ getDynamoDbClient: vi.fn(() => ({})) }));

vi.mock('@/storage/AnalyticsEventStorage', () => ({
    AnalyticsEventStorage: vi.fn().mockImplementation(() => ({
        writePageViewEvent: mockWritePageViewEvent,
        writeSongNotFoundEvent: mockWriteSongNotFoundEvent,
    })),
}));

vi.mock('@/util/hash', () => ({ hashValue: vi.fn(() => 'hashedip123456789012345') }));
vi.mock('@/util/userAgent', () => ({
    parseUserAgent: vi.fn(() => ({ uaType: 'person', browser: 'Chrome', os: 'Windows' })),
}));

vi.mock('@/lib/getRandomSongs', () => ({ getRandomSongs: mockGetRandomSongs }));

vi.mock('@/app/analysis/[artistName]/[songName]/[hash]/AnalysisDisplay', () => ({
    AnalysisDisplay: ({ result }: { result: { song?: { songName?: string } } }) => (
        <div data-testid="analysis-display">{result.song?.songName}</div>
    ),
}));

vi.mock('@/components/PopularSongsClient', () => ({
    PopularSongsClient: ({ songs, title }: { songs: unknown[]; title: string }) => (
        <div data-testid="popular-songs-client" data-title={title} data-count={songs.length} />
    ),
}));

import AnalysisDetailsPage, { generateMetadata } from '@/app/analysis/[artistName]/[songName]/[hash]/page';

beforeEach(() => {
    vi.clearAllMocks();
    mockGetRandomSongs.mockResolvedValue([]);
});

describe('AnalysisDetailsPage', () => {
    it('fetches by songKey and renders the result', async () => {
        const result = { songKey: 'Guster/Terrified/abc123', song: { songName: 'Terrified', artistName: 'Guster' } };
        mockApiGetPublic.mockResolvedValue({ data: { result }, headers: new Headers() });

        const element = await AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified', hash: 'abc123' }) });
        render(element);

        expect(mockApiGetPublic).toHaveBeenCalledWith('/v1/analyze-song?songKey=Guster%2FTerrified%2Fabc123');
        expect(screen.getByTestId('analysis-display')).toHaveTextContent('Terrified');
    });

    it('calls notFound() when the API reports a 404', async () => {
        const { ApiRequestError } = await import('@/lib/api');
        mockApiGetPublic.mockRejectedValue(new ApiRequestError(404, ['Analysis result not found'], new Headers()));

        await expect(
            AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified', hash: 'abc123' }) }),
        ).rejects.toThrow('NEXT_NOT_FOUND');

        expect(mockNotFound).toHaveBeenCalledTimes(1);
    });

    it('fires a songNotFound analytics event before calling notFound()', async () => {
        const { ApiRequestError } = await import('@/lib/api');
        mockApiGetPublic.mockRejectedValue(new ApiRequestError(404, ['not found'], new Headers()));

        await expect(
            AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified', hash: 'abc123' }) }),
        ).rejects.toThrow('NEXT_NOT_FOUND');

        expect(mockWriteSongNotFoundEvent).toHaveBeenCalledWith(
            expect.objectContaining({ songKey: 'Guster/Terrified/abc123' }),
        );
        expect(mockWritePageViewEvent).not.toHaveBeenCalled();
    });

    it('does not fire a songNotFound event when the result is found', async () => {
        const result = { songKey: 'Guster/Terrified/abc123', song: { songName: 'Terrified', artistName: 'Guster' } };
        mockApiGetPublic.mockResolvedValue({ data: { result }, headers: new Headers() });

        const element = await AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified', hash: 'abc123' }) });
        render(element);

        expect(mockWriteSongNotFoundEvent).not.toHaveBeenCalled();
        expect(mockWritePageViewEvent).toHaveBeenCalledTimes(1);
    });

    it('calls notFound() when the API call fails unexpectedly', async () => {
        mockApiGetPublic.mockRejectedValue(new TypeError('fetch failed'));

        await expect(
            AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified', hash: 'abc123' }) }),
        ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('encodes literal + in song name as %2B ("34+35" by Ariana Grande)', async () => {
        const result = { songKey: 'Ariana-Grande/34%2B35/abc123', song: { songName: '34+35', artistName: 'Ariana Grande' } };
        mockApiGetPublic.mockResolvedValue({ data: { result }, headers: new Headers() });

        await AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Ariana-Grande', songName: '34+35', hash: 'abc123' }) });

        const expectedSongKey = 'Ariana-Grande/34%2B35/abc123';
        expect(mockApiGetPublic).toHaveBeenCalledWith(`/v1/analyze-song?songKey=${encodeURIComponent(expectedSongKey)}`);
    });

    it('percent-encodes Korean artist name and special chars in song title', async () => {
        const fullTitle = 'A Song To Make You Smile (featuring RM, j-hope, and Hareem)';
        const truncatedTitle = fullTitle.slice(0, 50).trim();
        const result = { song: { songName: fullTitle, artistName: '이승기' } };
        mockApiGetPublic.mockResolvedValue({ data: { result }, headers: new Headers() });

        const encodeUri = (s: string) => encodeURIComponent(s).replace(/(%20)+/g, '-');
        const storedArtistPart = encodeUri('이승기');
        const storedSongPart = encodeUri(truncatedTitle);
        const artistParam = decodeURIComponent(storedArtistPart);
        const songParam = decodeURIComponent(storedSongPart);

        await AnalysisDetailsPage({
            params: Promise.resolve({ artistName: artistParam, songName: songParam, hash: 'abc123' }),
        });

        const expectedSongKey = `${storedArtistPart}/${storedSongPart}/abc123`;
        expect(mockApiGetPublic).toHaveBeenCalledWith(`/v1/analyze-song?songKey=${encodeURIComponent(expectedSongKey)}`);
    });

    it('encodes + = < in song name ("u + me = <3" by Aliah)', async () => {
        const result = { song: { songName: 'u + me = <3', artistName: 'Aliah' } };
        mockApiGetPublic.mockResolvedValue({ data: { result }, headers: new Headers() });

        await AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Aliah', songName: 'u-+-me-=-<3', hash: 'abc123' }) });

        const expectedSongKey = 'Aliah/u-%2B-me-%3D-%3C3/abc123';
        expect(mockApiGetPublic).toHaveBeenCalledWith(`/v1/analyze-song?songKey=${encodeURIComponent(expectedSongKey)}`);
    });

    it('issues a permanentRedirect (not a silent retry) when %2B lookup finds a migrated key', async () => {
        const { ApiRequestError } = await import('@/lib/api');
        const result = { songKey: 'Kendrick-Lamar/Sing-About-Me/abc123', song: { songName: 'Sing About Me', artistName: 'Kendrick Lamar' } };

        mockApiGetPublic.mockRejectedValueOnce(new ApiRequestError(404, ['not found'], new Headers()));
        mockApiGetPublic.mockResolvedValueOnce({ data: { result }, headers: new Headers() });

        await expect(
            AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Kendrick+Lamar', songName: 'Sing+About+Me', hash: 'abc123' }) }),
        ).rejects.toThrow('NEXT_REDIRECT');

        expect(mockPermanentRedirect).toHaveBeenCalledWith('/analysis/Kendrick-Lamar/Sing-About-Me/abc123');
    });

    it('does not fire songNotFound when %2B redirect fires', async () => {
        const { ApiRequestError } = await import('@/lib/api');
        const result = { songKey: 'Kendrick-Lamar/Sing-About-Me/abc123', song: { songName: 'Sing About Me', artistName: 'Kendrick Lamar' } };

        mockApiGetPublic.mockRejectedValueOnce(new ApiRequestError(404, ['not found'], new Headers()));
        mockApiGetPublic.mockResolvedValueOnce({ data: { result }, headers: new Headers() });

        await expect(
            AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Kendrick+Lamar', songName: 'Sing+About+Me', hash: 'abc123' }) }),
        ).rejects.toThrow('NEXT_REDIRECT');

        expect(mockWriteSongNotFoundEvent).not.toHaveBeenCalled();
    });

    it('does not retry when the key has no %2B and the lookup returns 404', async () => {
        const { ApiRequestError } = await import('@/lib/api');
        mockApiGetPublic.mockRejectedValue(new ApiRequestError(404, ['not found'], new Headers()));

        await expect(
            AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified', hash: 'abc123' }) }),
        ).rejects.toThrow('NEXT_NOT_FOUND');

        expect(mockApiGetPublic).toHaveBeenCalledTimes(1);
    });

    it('renders PopularSongsClient when random songs are returned', async () => {
        const result = { songKey: 'Guster/Terrified/abc123', song: { songName: 'Terrified', artistName: 'Guster' } };
        mockApiGetPublic.mockResolvedValue({ data: { result }, headers: new Headers() });
        mockGetRandomSongs.mockResolvedValue([
            { songKey: 'Other/Song/xyz', songName: 'Other Song', artistName: 'Other Artist' },
        ]);

        const element = await AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified', hash: 'abc123' }) });
        render(element);

        expect(screen.getByTestId('popular-songs-client')).toBeInTheDocument();
    });

    it('does not render PopularSongsClient when random songs returns empty', async () => {
        const result = { songKey: 'Guster/Terrified/abc123', song: { songName: 'Terrified', artistName: 'Guster' } };
        mockApiGetPublic.mockResolvedValue({ data: { result }, headers: new Headers() });
        mockGetRandomSongs.mockResolvedValue([]);

        const element = await AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified', hash: 'abc123' }) });
        render(element);

        expect(screen.queryByTestId('popular-songs-client')).not.toBeInTheDocument();
    });

    it('passes the current songKey to getRandomSongs to exclude it', async () => {
        const result = { songKey: 'Guster/Terrified/abc123', song: { songName: 'Terrified', artistName: 'Guster' } };
        mockApiGetPublic.mockResolvedValue({ data: { result }, headers: new Headers() });

        await AnalysisDetailsPage({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified', hash: 'abc123' }) });

        expect(mockGetRandomSongs).toHaveBeenCalledWith('Guster/Terrified/abc123');
    });
});

describe('generateMetadata', () => {
    it('falls back to a not-found title when the result cannot be fetched', async () => {
        mockApiGetPublic.mockRejectedValue(new Error('boom'));

        const metadata = await generateMetadata({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified', hash: 'abc123' }) });

        expect(metadata).toEqual({ title: 'Analysis Not Found | LyricsRay' });
    });

    it('fetches by the full reconstructed songKey', async () => {
        mockApiGetPublic.mockResolvedValue({
            data: {
                result: {
                    songKey: 'Guster/Terrified/abc123',
                    song: { songName: 'Terrified', artistName: 'Guster' },
                    recommendedAge: 13,
                    analysis: 'Some analysis text',
                },
            },
            headers: new Headers(),
        });

        const metadata = await generateMetadata({ params: Promise.resolve({ artistName: 'Guster', songName: 'Terrified', hash: 'abc123' }) });

        expect(mockApiGetPublic).toHaveBeenCalledWith('/v1/analyze-song?songKey=Guster%2FTerrified%2Fabc123');
        expect(metadata.title).toContain('Terrified');
    });
});
