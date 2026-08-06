import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockApiGetPublic, mockNotFound, mockWritePageViewEvent } = vi.hoisted(() => ({
    mockApiGetPublic: vi.fn(),
    mockNotFound: vi.fn(() => {
        // Mirrors Next.js's real notFound(), which halts rendering by throwing.
        throw new Error('NEXT_NOT_FOUND');
    }),
    mockWritePageViewEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/logger/logger', () => ({
    logger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('next/navigation', () => ({ notFound: mockNotFound }));

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
    })),
}));

vi.mock('@/util/hash', () => ({ hashValue: vi.fn(() => 'hashedip123456789012345') }));
vi.mock('@/util/userAgent', () => ({
    parseUserAgent: vi.fn(() => ({ uaType: 'person', browser: 'Chrome', os: 'Windows' })),
}));

vi.mock('@/app/analysis/[...songKeys]/AnalysisDisplay', () => ({
    AnalysisDisplay: ({ result }: { result: { song?: { songName?: string } } }) => (
        <div data-testid="analysis-display">{result.song?.songName}</div>
    ),
}));

import AnalysisDetailsPage, { generateMetadata } from '@/app/analysis/[...songKeys]/page';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('AnalysisDetailsPage', () => {
    it('fetches by songKey via a direct API call (not a self-referential HTTP hop) and renders the result', async () => {
        const result = { songKey: 'Guster/Terrified/abc123', song: { songName: 'Terrified', artistName: 'Guster' } };
        mockApiGetPublic.mockResolvedValue({ data: { result }, headers: new Headers() });

        const element = await AnalysisDetailsPage({ params: Promise.resolve({ songKeys: ['Guster', 'Terrified', 'abc123'] }) });
        render(element);

        expect(mockApiGetPublic).toHaveBeenCalledWith('/v1/analyze-song?songKey=Guster%2FTerrified%2Fabc123');
        expect(screen.getByTestId('analysis-display')).toHaveTextContent('Terrified');
    });

    it('reconstructs a legacy pipe/hash songKey from a single already-decoded route segment', async () => {
        mockApiGetPublic.mockResolvedValue({
            data: { result: { songKey: 'Guster|Terrified#abc123', song: { songName: 'Terrified' } } },
            headers: new Headers(),
        });

        await AnalysisDetailsPage({ params: Promise.resolve({ songKeys: ['Guster|Terrified#abc123'] }) });

        expect(mockApiGetPublic).toHaveBeenCalledWith('/v1/analyze-song?songKey=Guster%7CTerrified%23abc123');
    });

    it('reconstructs a legacy pipe/hash songKey from a single still-encoded route segment', async () => {
        // Next.js may deliver route params without decoding %7C / %23; the page
        // must decode them before re-encoding for the query string, or the key
        // arrives at the Lambda double-encoded and never matches the DynamoDB PK.
        mockApiGetPublic.mockResolvedValue({
            data: { result: { songKey: 'Guster|Terrified#abc123', song: { songName: 'Terrified' } } },
            headers: new Headers(),
        });

        await AnalysisDetailsPage({ params: Promise.resolve({ songKeys: ['Guster%7CTerrified%23abc123'] }) });

        expect(mockApiGetPublic).toHaveBeenCalledWith('/v1/analyze-song?songKey=Guster%7CTerrified%23abc123');
    });

    it('calls notFound() when the API reports a 404', async () => {
        const { ApiRequestError } = await import('@/lib/api');
        mockApiGetPublic.mockRejectedValue(new ApiRequestError(404, ['Analysis result not found'], new Headers()));

        await expect(
            AnalysisDetailsPage({ params: Promise.resolve({ songKeys: ['Guster', 'Terrified', 'abc123'] }) }),
        ).rejects.toThrow('NEXT_NOT_FOUND');

        expect(mockNotFound).toHaveBeenCalledTimes(1);
    });

    it('calls notFound() (rather than throwing) when the API call fails unexpectedly', async () => {
        mockApiGetPublic.mockRejectedValue(new TypeError('fetch failed'));

        await expect(
            AnalysisDetailsPage({ params: Promise.resolve({ songKeys: ['Guster', 'Terrified', 'abc123'] }) }),
        ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('encodes literal + in song name as %2B ("34+35" by Ariana Grande)', async () => {
        // Next.js decodes %2B in the path segment to '+', yielding '34+35'.
        // The page must re-encode it as %2B (literal plus), not treat it as a space proxy.
        const result = { songKey: 'Ariana-Grande/34%2B35/abc123', song: { songName: '34+35', artistName: 'Ariana Grande' } };
        mockApiGetPublic.mockResolvedValue({ data: { result }, headers: new Headers() });

        await AnalysisDetailsPage({ params: Promise.resolve({ songKeys: ['Ariana-Grande', '34+35', 'abc123'] }) });

        const expectedSongKey = 'Ariana-Grande/34%2B35/abc123';
        expect(mockApiGetPublic).toHaveBeenCalledWith(`/v1/analyze-song?songKey=${encodeURIComponent(expectedSongKey)}`);
    });

    it('percent-encodes Korean artist name and special chars in song title (이승기 / long title)', async () => {
        // makeSongKey truncates song name to 50 chars; encodeURIComponent leaves ( ) as-is
        // (they are unreserved) but encodes spaces→%20 (replaced with -) and commas→%2C.
        // Next.js decodes %2C→, from path segments; ( stays as-is since it was never encoded.
        const fullTitle = 'A Song To Make You Smile (featuring RM, j-hope, and Hareem)';
        const truncatedTitle = fullTitle.slice(0, 50).trim();
        const result = { song: { songName: fullTitle, artistName: '이승기' } };
        mockApiGetPublic.mockResolvedValue({ data: { result }, headers: new Headers() });

        // Compute what makeSongKey stores and what Next.js delivers as params
        const encodeUri = (s: string) => encodeURIComponent(s).replace(/(%20)+/g, '-');
        const storedArtistPart = encodeUri('이승기');   // percent-encoded Korean bytes
        const storedSongPart = encodeUri(truncatedTitle);
        // Next.js decodes %XX sequences in path params (encodeUri left %2C encoded)
        const artistParam = decodeURIComponent(storedArtistPart);   // '이승기'
        const songParam = decodeURIComponent(storedSongPart);       // '...RM,-j-hope,-an'

        await AnalysisDetailsPage({
            params: Promise.resolve({ songKeys: [artistParam, songParam, 'abc123'] }),
        });

        const expectedSongKey = `${storedArtistPart}/${storedSongPart}/abc123`;
        expect(mockApiGetPublic).toHaveBeenCalledWith(`/v1/analyze-song?songKey=${encodeURIComponent(expectedSongKey)}`);
    });

    it('encodes + = < in song name ("u + me = <3" by Aliah)', async () => {
        // Next.js decodes %2B→+, %3D→=, %3C→< in path segments.
        const result = { song: { songName: 'u + me = <3', artistName: 'Aliah' } };
        mockApiGetPublic.mockResolvedValue({ data: { result }, headers: new Headers() });

        await AnalysisDetailsPage({ params: Promise.resolve({ songKeys: ['Aliah', 'u-+-me-=-<3', 'abc123'] }) });

        const expectedSongKey = 'Aliah/u-%2B-me-%3D-%3C3/abc123';
        expect(mockApiGetPublic).toHaveBeenCalledWith(`/v1/analyze-song?songKey=${encodeURIComponent(expectedSongKey)}`);
    });

    it('falls back to legacy key format (+ as space proxy) when new-format key returns 404', async () => {
        // Songs analyzed before the - space proxy migration have + in stored keys for spaces.
        // The page must try the new encoding first, then fall back to the old + encoding.
        const { ApiRequestError } = await import('@/lib/api');
        const result = { song: { songName: 'Sing About Me', artistName: 'Kendrick Lamar' } };

        mockApiGetPublic.mockRejectedValueOnce(new ApiRequestError(404, ['not found'], new Headers()));
        mockApiGetPublic.mockResolvedValueOnce({ data: { result }, headers: new Headers() });

        await AnalysisDetailsPage({
            params: Promise.resolve({ songKeys: ['Kendrick+Lamar', 'Sing+About+Me', 'abc123'] }),
        });

        // First call: new format — '+' treated as literal '%2B', double-encoded in query
        const newFormatKey = 'Kendrick%2BLamar/Sing%2BAbout%2BMe/abc123';
        expect(mockApiGetPublic).toHaveBeenNthCalledWith(1, `/v1/analyze-song?songKey=${encodeURIComponent(newFormatKey)}`);

        // Second call: legacy format — '+' kept as space proxy, encoded to %2B in query
        const legacyKey = 'Kendrick+Lamar/Sing+About+Me/abc123';
        expect(mockApiGetPublic).toHaveBeenNthCalledWith(2, `/v1/analyze-song?songKey=${encodeURIComponent(legacyKey)}`);

        expect(mockApiGetPublic).toHaveBeenCalledTimes(2);
    });

    it('does not attempt a second API call when new-format and legacy keys are identical', async () => {
        // For names without '+', both encodings produce the same key — no extra call needed.
        const { ApiRequestError } = await import('@/lib/api');
        mockApiGetPublic.mockRejectedValue(new ApiRequestError(404, ['not found'], new Headers()));

        await expect(
            AnalysisDetailsPage({ params: Promise.resolve({ songKeys: ['Guster', 'Terrified', 'abc123'] }) }),
        ).rejects.toThrow('NEXT_NOT_FOUND');

        expect(mockApiGetPublic).toHaveBeenCalledTimes(1);
    });
});

describe('generateMetadata', () => {
    it('falls back to a not-found title when the result cannot be fetched', async () => {
        mockApiGetPublic.mockRejectedValue(new Error('boom'));

        const metadata = await generateMetadata({ params: Promise.resolve({ songKeys: ['Guster', 'Terrified', 'abc123'] }) });

        expect(metadata).toEqual({ title: 'Analysis Not Found | LyricsRay' });
    });

    // Regression test: generateMetadata used to only use songKeys[0] when there was
    // exactly one segment, silently reconstructing an EMPTY songKey for every
    // current-format (multi-segment) key — which the API correctly rejected as
    // "songKey parameter is required", failing metadata generation for every song.
    it('fetches by the full reconstructed songKey for a multi-segment (current-format) key', async () => {
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

        const metadata = await generateMetadata({ params: Promise.resolve({ songKeys: ['Guster', 'Terrified', 'abc123'] }) });

        expect(mockApiGetPublic).toHaveBeenCalledWith('/v1/analyze-song?songKey=Guster%2FTerrified%2Fabc123');
        expect(metadata.title).toContain('Terrified');
    });
});
