import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockApiGetPublic, mockNotFound } = vi.hoisted(() => ({
    mockApiGetPublic: vi.fn(),
    mockNotFound: vi.fn(() => {
        // Mirrors Next.js's real notFound(), which halts rendering by throwing.
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

vi.mock('@/logger/logger', () => ({
    logger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('next/navigation', () => ({ notFound: mockNotFound }));

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, apiGetPublic: mockApiGetPublic };
});

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

    it('reconstructs a legacy pipe/hash songKey from a single route segment', async () => {
        mockApiGetPublic.mockResolvedValue({
            data: { result: { songKey: 'Guster|Terrified#abc123', song: { songName: 'Terrified' } } },
            headers: new Headers(),
        });

        await AnalysisDetailsPage({ params: Promise.resolve({ songKeys: ['Guster|Terrified#abc123'] }) });

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
});

describe('generateMetadata', () => {
    it('falls back to a not-found title when the result cannot be fetched', async () => {
        mockApiGetPublic.mockRejectedValue(new Error('boom'));

        const metadata = await generateMetadata({ params: Promise.resolve({ songKeys: ['Guster', 'Terrified', 'abc123'] }) });

        expect(metadata).toEqual({ title: 'Analysis Not Found | LyricsRay' });
    });
});
