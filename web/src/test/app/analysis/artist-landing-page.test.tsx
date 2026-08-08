import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockGetArtistAnalyses, mockNotFound, mockPermanentRedirect } = vi.hoisted(() => ({
    mockGetArtistAnalyses: vi.fn(),
    mockNotFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
    mockPermanentRedirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }),
}));

vi.mock('next/navigation', () => ({
    notFound: mockNotFound,
    permanentRedirect: mockPermanentRedirect,
}));

vi.mock('@/lib/getArtistAnalyses', () => ({ getArtistAnalyses: mockGetArtistAnalyses }));

vi.mock('@/app/analysis/[artistName]/ArtistLandingDisplay', () => ({
    ArtistLandingDisplay: ({ artistName, songs }: { artistName: string; songs: unknown[] }) => (
        <div data-testid="artist-landing" data-artist={artistName} data-count={songs.length} />
    ),
}));

import ArtistLandingPage, { generateMetadata } from '@/app/analysis/[artistName]/page';

const makeSong = (artistName = 'Guster') => ({
    songKey: `${artistName.replace(/ /g, '-')}/Terrified/abc123`,
    songName: 'Terrified',
    artistName,
    recommendedAge: 10,
    themes: [],
    appropriate: 1,
    date: '2026-01-01T00:00:00.000Z',
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe('ArtistLandingPage', () => {
    it('fetches and renders artist analyses for a valid artist key', async () => {
        mockGetArtistAnalyses.mockResolvedValue([makeSong('Guster')]);

        const element = await ArtistLandingPage({ params: Promise.resolve({ artistName: 'Guster' }) });
        render(element);

        expect(screen.getByTestId('artist-landing')).toHaveAttribute('data-artist', 'Guster');
        expect(screen.getByTestId('artist-landing')).toHaveAttribute('data-count', '1');
    });

    it('calls notFound() when artist has no analyses', async () => {
        mockGetArtistAnalyses.mockResolvedValue([]);

        await expect(
            ArtistLandingPage({ params: Promise.resolve({ artistName: 'Guster' }) }),
        ).rejects.toThrow('NEXT_NOT_FOUND');

        expect(mockNotFound).toHaveBeenCalledTimes(1);
    });

    it('uses artistName from first result as display name', async () => {
        mockGetArtistAnalyses.mockResolvedValue([makeSong('Guster')]);

        const element = await ArtistLandingPage({ params: Promise.resolve({ artistName: 'Guster' }) });
        render(element);

        expect(screen.getByTestId('artist-landing')).toHaveAttribute('data-artist', 'Guster');
    });

    it('redirects to 3-segment URL for legacy Artist|Song#hash key', async () => {
        await expect(
            ArtistLandingPage({ params: Promise.resolve({ artistName: 'Guster|Terrified#abc123' }) }),
        ).rejects.toThrow('NEXT_REDIRECT');

        expect(mockPermanentRedirect).toHaveBeenCalledWith('/analysis/Guster/Terrified/abc123');
    });

    it('redirects when legacy key arrives percent-encoded (%7C / %23)', async () => {
        await expect(
            ArtistLandingPage({ params: Promise.resolve({ artistName: 'Guster%7CTerrified%23abc123' }) }),
        ).rejects.toThrow('NEXT_REDIRECT');

        expect(mockPermanentRedirect).toHaveBeenCalledWith('/analysis/Guster/Terrified/abc123');
    });

    it('does not fetch artist analyses when legacy key is detected', async () => {
        await expect(
            ArtistLandingPage({ params: Promise.resolve({ artistName: 'Guster|Terrified#abc123' }) }),
        ).rejects.toThrow('NEXT_REDIRECT');

        expect(mockGetArtistAnalyses).not.toHaveBeenCalled();
    });
});

describe('generateMetadata', () => {
    it('returns a title with the decoded artist name', async () => {
        const metadata = await generateMetadata({ params: Promise.resolve({ artistName: 'Taylor-Swift' }) });
        expect(metadata.title).toContain('Taylor Swift');
        expect(metadata.title).toContain('LyricsRay');
    });
});
