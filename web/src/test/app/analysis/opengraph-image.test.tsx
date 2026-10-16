import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFetchAnalysisResult, mockGetArtistAnalyses, mockRenderOgImage, mockLoadOgLogo } = vi.hoisted(() => ({
    mockFetchAnalysisResult: vi.fn(),
    mockGetArtistAnalyses: vi.fn(),
    mockRenderOgImage: vi.fn((element: unknown, cacheSeconds: number) => ({ element, cacheSeconds })),
    mockLoadOgLogo: vi.fn(),
}));

vi.mock('@/lib/fetchAnalysisResult', () => ({ fetchAnalysisResult: mockFetchAnalysisResult }));
vi.mock('@/lib/getArtistAnalyses', () => ({ getArtistAnalyses: mockGetArtistAnalyses }));
vi.mock('@/og/ogLogo', () => ({ loadOgLogo: mockLoadOgLogo }));
vi.mock('@/og/renderOgImage', async () => {
    const actual = await vi.importActual<typeof import('@/og/renderOgImage')>('@/og/renderOgImage');
    return { ...actual, renderOgImage: mockRenderOgImage };
});

import AnalysisImage from '@/app/analysis/[artistName]/[songName]/[hash]/opengraph-image';
import ArtistImage from '@/app/analysis/[artistName]/opengraph-image';
import { AnalysisOgCard } from '@/og/AnalysisOgCard';
import { ArtistOgCard } from '@/og/ArtistOgCard';
import { OG_CACHE_SECONDS } from '@/og/renderOgImage';

const renderedCall = () => mockRenderOgImage.mock.calls[0] as unknown as [{ type: unknown; props: Record<string, unknown> }, number];

beforeEach(() => {
    vi.clearAllMocks();
    mockLoadOgLogo.mockResolvedValue('data:logo');
});

describe('analysis opengraph-image', () => {
    const params = Promise.resolve({ artistName: 'Guster', songName: 'Terrified', hash: 'abc123' });

    it('looks the analysis up by the reconstructed song key and renders its card with the analysis cache', async () => {
        mockFetchAnalysisResult.mockResolvedValue({
            song: { songName: 'Terrified', artistName: 'Guster' },
            appropriate: 2,
            recommendedAge: 13,
            summary: 'Mild',
            themes: ['anxiety'],
        });

        await AnalysisImage({ params });

        expect(mockFetchAnalysisResult).toHaveBeenCalledWith('Guster/Terrified/abc123');
        const [element, cacheSeconds] = renderedCall();
        expect(element.type).toBe(AnalysisOgCard);
        expect(element.props).toMatchObject({ songName: 'Terrified', artistName: 'Guster', recommendedAge: 13, logoSrc: 'data:logo' });
        expect(cacheSeconds).toBe(OG_CACHE_SECONDS.analysis);
    });

    it('re-encodes path segments without double-encoding them', async () => {
        mockFetchAnalysisResult.mockResolvedValue(null);

        await AnalysisImage({ params: Promise.resolve({ artistName: 'The+Who', songName: 'Tommy%2C+Can+You', hash: 'h1' }) });

        expect(mockFetchAnalysisResult).toHaveBeenCalledWith('The%2BWho/Tommy%2C%2BCan%2BYou/h1');
    });

    it('returns a cheap cacheable 404 without rendering or loading the logo when the analysis is missing', async () => {
        mockFetchAnalysisResult.mockResolvedValue(null);

        const response = (await AnalysisImage({ params })) as Response;

        expect(response.status).toBe(404);
        expect(response.headers.get('Cache-Control')).toContain(`s-maxage=${OG_CACHE_SECONDS.missing}`);
        expect(mockRenderOgImage).not.toHaveBeenCalled();
        expect(mockLoadOgLogo).not.toHaveBeenCalled();
    });

    it('tolerates a result with no song details or themes', async () => {
        mockFetchAnalysisResult.mockResolvedValue({ appropriate: 1, recommendedAge: 'All' });

        await AnalysisImage({ params });

        expect(renderedCall()[0].props).toMatchObject({ songName: '', artistName: undefined, themes: undefined });
    });

    it('propagates a logo load failure rather than caching a broken image', async () => {
        mockFetchAnalysisResult.mockResolvedValue({ appropriate: 1, recommendedAge: 'All' });
        mockLoadOgLogo.mockRejectedValue(new Error('ENOENT'));

        await expect(AnalysisImage({ params })).rejects.toThrow('ENOENT');
    });
});

describe('artist opengraph-image', () => {
    const params = Promise.resolve({ artistName: 'Taylor-Swift' });
    const song = (appropriate: number, recommendedAge: number | string) => ({
        songKey: `k${appropriate}${recommendedAge}`,
        songName: 'S',
        artistName: 'Taylor Swift',
        recommendedAge,
        themes: [],
        appropriate,
        date: '',
    });

    it('renders the artist card with the count, summary, age spread and artist cache', async () => {
        mockGetArtistAnalyses.mockResolvedValue([song(1, 'All'), song(2, 13)]);

        await ArtistImage({ params });

        expect(mockGetArtistAnalyses).toHaveBeenCalledWith('Taylor-Swift');
        const [element, cacheSeconds] = renderedCall();
        expect(element.type).toBe(ArtistOgCard);
        expect(element.props).toMatchObject({ artistName: 'Taylor Swift', songCount: 2 });
        expect(element.props.ageBuckets).toHaveLength(2);
        expect(cacheSeconds).toBe(OG_CACHE_SECONDS.artist);
    });

    it('returns a cheap cacheable 404 when the artist has no analyses', async () => {
        mockGetArtistAnalyses.mockResolvedValue([]);

        const response = (await ArtistImage({ params })) as Response;

        expect(response.status).toBe(404);
        expect(mockRenderOgImage).not.toHaveBeenCalled();
    });

    it('renders a single-song artist', async () => {
        mockGetArtistAnalyses.mockResolvedValue([song(3, 18)]);

        await ArtistImage({ params });

        expect(renderedCall()[0].props).toMatchObject({ songCount: 1 });
        expect(renderedCall()[0].props.ageBuckets).toHaveLength(1);
    });
});
