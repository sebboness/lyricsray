import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { AnalysisResult } from '@/storage/AnalysisResultStorage';
import { AnalysisDisplay } from './AnalysisDisplay';
import { logger } from '@/logger/logger';
import { getAnalysisDetailsPath } from '@/util/routeHelper';
import { apiGetPublic, ApiRequestError } from '@/lib/api';
import { getDynamoDbClient } from '@/storage/dynamodb';
import { AnalyticsEventStorage } from '@/storage/AnalyticsEventStorage';
import { hashValue } from '@/util/hash';
import { parseUserAgent } from '@/util/userAgent';

const analyticsStorage = new AnalyticsEventStorage(getDynamoDbClient());

interface PageProps {
    params: Promise<{
        songKeys: string[];
    }>;
}

function reEncodeSegment(segment: string): string {
    if (/%[0-9a-fA-F]{2}/.test(segment)) {
        try { segment = decodeURIComponent(segment); } catch { /* malformed, use as-is */ }
    }
    // New-format keys use '-' as the space proxy; '+' is always a literal '+' (%2B).
    return encodeURIComponent(segment);
}

function reEncodeSegmentLegacy(segment: string): string {
    // Pre-migration keys used '+' as the space proxy (split on +, re-encode each word).
    if (/%[0-9a-fA-F]{2}/.test(segment)) {
        try { segment = decodeURIComponent(segment); } catch { }
    }
    return segment.split('+').map(encodeURIComponent).join('+');
}

/**
 * Reconstructs the full song key from the catch-all route's path segments.
 * Current-format keys are 3 segments (artist/song/hash); legacy single-segment
 * keys (Artist|Song#hash) are decoded verbatim.
 */
function reconstructSongKey(songKeys: string[], legacy = false): string {
    if (songKeys.length === 1) {
        // Legacy single-segment key — decode any %7C/%23 Next.js may not have decoded.
        try { return decodeURIComponent(songKeys[0]); } catch { return songKeys[0]; }
    }
    return songKeys.map(legacy ? reEncodeSegmentLegacy : reEncodeSegment).join('/');
}

/**
 * Fetches the analysis result from the Lambda API, with an optional fallback to a
 * legacy key format (where + was used as the space proxy instead of -).
 */
async function getAnalysisResult(songKey: string, legacyKey?: string): Promise<AnalysisResult | null> {
    try {
        const { data } = await apiGetPublic<{ result: AnalysisResult }>(`/v1/analyze-song?songKey=${encodeURIComponent(songKey)}`);
        return data.result ?? null;
    } catch (error) {
        if (error instanceof ApiRequestError && error.statusCode === 404) {
            if (legacyKey && legacyKey !== songKey) {
                try {
                    const { data } = await apiGetPublic<{ result: AnalysisResult }>(`/v1/analyze-song?songKey=${encodeURIComponent(legacyKey)}`);
                    return data.result ?? null;
                } catch (err2) {
                    if (err2 instanceof ApiRequestError && err2.statusCode === 404) return null;
                    logger.error('Error fetching analysis result (legacy key):', err2);
                }
            }
            return null;
        }
        logger.error('Error fetching analysis result:', error);
        return null;
    }
}

export default async function AnalysisDetailsPage({ params }: PageProps) {
    const { songKeys } = await params;
    const songKey = reconstructSongKey(songKeys);
    const legacyKey = reconstructSongKey(songKeys, true);

    const result = await getAnalysisResult(songKey, legacyKey);

    if (!result) {
        notFound();
    }

    const requestHeaders = await headers();
    const ua = requestHeaders.get('user-agent') ?? '';
    const ip = requestHeaders.get('cf-connecting-ip')
        ?? requestHeaders.get('x-real-ip')
        ?? requestHeaders.get('x-forwarded-for')?.split(',')[0].trim()
        ?? '';
    const now = new Date();
    void analyticsStorage.writePageViewEvent({
        date: now.toISOString().split('T')[0],
        timestamp: now.toISOString(),
        hashedIp: hashValue(ip),
        ...parseUserAgent(ua),
        songKey,
        artistName: result.song?.artistName ?? '',
        songName: result.song?.songName ?? '',
    });

    return <AnalysisDisplay result={result} />;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
    const { songKeys } = await params;
    const songKey = reconstructSongKey(songKeys);
    const legacyKey = reconstructSongKey(songKeys, true);
    const result = await getAnalysisResult(songKey, legacyKey);

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
