export const dynamic = 'force-dynamic';

import { notFound, permanentRedirect } from 'next/navigation';
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
import { getRequestContext } from '@/util/request';
import { getRandomSongs } from '@/lib/getRandomSongs';
import { PopularSongsClient } from '@/components/PopularSongsClient';
import { Container } from '@mui/material';

const analyticsStorage = new AnalyticsEventStorage(getDynamoDbClient());

interface PageProps {
    params: Promise<{
        artistName: string;
        songName: string;
        hash: string;
    }>;
}

function reEncodeSegment(segment: string): string {
    if (/%[0-9a-fA-F]{2}/.test(segment)) {
        try { segment = decodeURIComponent(segment); } catch { /* malformed, use as-is */ }
    }
    return encodeURIComponent(segment);
}

async function fetchResult(songKey: string): Promise<AnalysisResult | null> {
    try {
        const { data } = await apiGetPublic<{ result: AnalysisResult }>(`/v1/analyze-song?songKey=${encodeURIComponent(songKey)}`);
        return data.result ?? null;
    } catch (error) {
        if (error instanceof ApiRequestError && error.statusCode === 404) return null;
        logger.error('Error fetching analysis result:', error);
        return null;
    }
}

async function getAnalysisResult(songKey: string): Promise<{ result: AnalysisResult | null; redirectTo: string | null }> {
    const result = await fetchResult(songKey);
    if (result) return { result, redirectTo: null };

    if (songKey.includes('%2B')) {
        const retried = await fetchResult(songKey.replaceAll('%2B', '-'));
        if (retried) return { result: null, redirectTo: `/analysis/${retried.songKey}` };
    }
    return { result: null, redirectTo: null };
}

export default async function AnalysisDetailsPage({ params }: PageProps) {
    const { artistName, songName, hash } = await params;
    const songKey = [artistName, songName, hash].map(reEncodeSegment).join('/');

    const [{ result, redirectTo }, randomSongs, requestHeaders] = await Promise.all([
        getAnalysisResult(songKey),
        getRandomSongs(songKey),
        headers(),
    ]);

    if (redirectTo) {
        permanentRedirect(redirectTo);
    }

    const { ua, ip } = getRequestContext(requestHeaders);
    const now = new Date();
    const baseEvent = {
        date: now.toISOString().split('T')[0],
        timestamp: now.toISOString(),
        hashedIp: hashValue(ip),
        ...parseUserAgent(ua),
    };

    if (!result) {
        void analyticsStorage.writeSongNotFoundEvent({ ...baseEvent, songKey });
        notFound();
    }

    void analyticsStorage.writePageViewEvent({
        ...baseEvent,
        songKey,
        artistName: result.song?.artistName ?? '',
        songName: result.song?.songName ?? '',
    });

    return (
        <>
            <AnalysisDisplay result={result} />
            {randomSongs.length > 0 && (
                <Container maxWidth="md" sx={{ pb: 4 }}>
                    <PopularSongsClient title="More analyzed lyrics" showTitle songs={randomSongs} />
                </Container>
            )}
        </>
    );
}

export async function generateMetadata({ params }: PageProps) {
    const { artistName, songName, hash } = await params;
    const songKey = [artistName, songName, hash].map(reEncodeSegment).join('/');
    const result = await getAnalysisResult(songKey);

    if (!result.result) {
        return { title: 'Analysis Not Found | LyricsRay' };
    }

    const { result: analysis } = result;
    const songTitle = analysis.song?.songName || 'Unknown Song';
    const artist = analysis.song?.artistName || 'Unknown Artist';
    const title = `LyricsRay Analysis for ${songTitle} by ${artist}`;
    const description = `Age-appropriate lyrics analysis for "${songTitle}" by ${artist}. `
        + `Minimum age: ${analysis.recommendedAge}. `
        + `Analysis: ${analysis.analysis.length > 100 ? (analysis.analysis.substring(0, 100) + '...') : analysis.analysis}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: getAnalysisDetailsPath(songKey),
            siteName: 'LyricsRay - Is this song safe for my child?',
            type: 'website',
        },
    };
}
