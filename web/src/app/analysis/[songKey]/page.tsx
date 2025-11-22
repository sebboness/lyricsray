import { notFound } from 'next/navigation';
import { AnalysisResult } from '@/storage/AnalysisResultStorage';
import { AnalysisDisplay } from './AnalysisDisplay';
import { logger } from '@/logger/logger';
import { getAnalysisDetailsPath } from '@/util/routeHelper';

interface PageProps {
    params: Promise<{
        songKey: string;
    }>;
}

/**
 * Fetches analysis result from API endpoint.
 * @param songKey {string} The key identifying the song analysis.
 * @returns {Promise<AnalysisResult|null>} A promise containing the analysis result for the song.
 */
async function getAnalysisResult(songKey: string): Promise<AnalysisResult | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/analyze-song/${encodeURIComponent(songKey)}`, {
            cache: 'no-store', // Ensure fresh data on each request
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.result || null;
    } catch (error) {
        logger.error('Error fetching analysis result:', error);
        return null;
    }
}

export default async function AnalysisDetailsPage({ params }: PageProps) {
    const { songKey } = await params;
    const decodedSongKey = decodeURIComponent(songKey);
    
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
    const { songKey } = await params;
    const decodedSongKey = decodeURIComponent(songKey);
    const result = await getAnalysisResult(decodedSongKey);

    if (!result) {
        return {
            title: 'Analysis Not Found | LyricsRay',
        };
    }

    const songTitle = result.song?.songName || 'Unknown Song';
    const artist = result.song?.artistName || 'Unknown Artist';
    const title =  `LyricsRay Analysis for ${songTitle} by ${artist}`;
    const description = `Age-appropriate lyrics analysis for "${songTitle}" by ${artist}. `
            + `Recommended age: ${result.recommendedAge}. `
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