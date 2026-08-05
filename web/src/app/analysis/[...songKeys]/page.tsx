import { notFound } from 'next/navigation';
import { AnalysisResult } from '@/storage/AnalysisResultStorage';
import { AnalysisDisplay } from './AnalysisDisplay';
import { logger } from '@/logger/logger';
import { getAnalysisDetailsPath } from '@/util/routeHelper';
import { apiGetPublic, ApiRequestError } from '@/lib/api';

interface PageProps {
    params: Promise<{
        songKeys: string[];
    }>;
}

/**
 * Reconstructs the full song key from the catch-all route's path segments.
 * Current-format keys are 3 real segments (`artist/song/hash`); legacy
 * pre-migration keys (see git history around `ca8ffa9`) are a single opaque
 * segment. Either way, joining on "/" gives back the original key.
 */
function reconstructSongKey(songKeys: string[]): string {
    const songKey = songKeys.join('/');
    return songKey.replace(/(\%2B)+/g, '+');
}

/**
 * Fetches the analysis result directly from the Lambda API — not via this app's
 * own `/api/analyze-song` route, which would require a self-referential HTTP
 * call out to this same server (fragile in server environments, and previously
 * broken in production because it depended on an env var that was never wired
 * up, silently falling back to a dev-only localhost URL).
 * @param songKey {string} The key identifying the song analysis.
 * @returns {Promise<AnalysisResult|null>} A promise containing the analysis result for the song.
 */
async function getAnalysisResult(songKey: string): Promise<AnalysisResult | null> {
    try {
        const { data } = await apiGetPublic<{ result: AnalysisResult }>(`/v1/analyze-song?songKey=${encodeURIComponent(songKey)}`);
        return data.result ?? null;
    } catch (error) {
        if (error instanceof ApiRequestError && error.statusCode === 404) {
            return null;
        }
        logger.error('Error fetching analysis result:', error);
        return null;
    }
}

export default async function AnalysisDetailsPage({ params }: PageProps) {
    const { songKeys } = await params;
    const decodedSongKey = reconstructSongKey(songKeys);

    // Fetch the analysis result
    const result = await getAnalysisResult(decodedSongKey);

    // If not found, show 404
    if (!result) {
        notFound();
    }

    return <AnalysisDisplay result={result} />;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
    const { songKeys } = await params;
    const songKey = reconstructSongKey(songKeys);
    const result = await getAnalysisResult(songKey);

    if (!result) {
        return {
            title: 'Analysis Not Found | LyricsRay',
        };
    }

    const songTitle = result.song?.songName || 'Unknown Song';
    const artist = result.song?.artistName || 'Unknown Artist';
    const title =  `LyricsRay Analysis for ${songTitle} by ${artist}`;
    const description = `Age-appropriate lyrics analysis for "${songTitle}" by ${artist}. `
            + `Minimum age: ${result.recommendedAge}. `
            + `Analysis: ${result.analysis.length > 100 ? (result.analysis.substring(0, 100) + '...') : result.analysis}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: getAnalysisDetailsPath(songKey),
            siteName: "LyricsRay - Is this song safe for my child?",
            type: 'website',
        }
    };
}
