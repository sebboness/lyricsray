import { notFound, permanentRedirect } from 'next/navigation';
import { getDynamoDbClient } from '@/storage/dynamodb';
import { AnalyticsEventStorage } from '@/storage/AnalyticsEventStorage';
import { headers } from 'next/headers';
import { hashValue } from '@/util/hash';
import { parseUserAgent } from '@/util/userAgent';
import { getRequestContext } from '@/util/request';
import { getArtistAnalyses } from '@/lib/getArtistAnalyses';

const analyticsStorage = new AnalyticsEventStorage(getDynamoDbClient());

interface PageProps {
    params: Promise<{ artistName: string; songName: string }>;
}

function reEncodeSegment(segment: string): string {
    if (/%[0-9a-fA-F]{2}/.test(segment)) {
        try { segment = decodeURIComponent(segment); } catch { /* malformed, use as-is */ }
    }
    return encodeURIComponent(segment);
}

export default async function SongLookupPage({ params }: PageProps) {
    const { artistName, songName } = await params;

    // Build the artist+song prefix; getArtistAnalyses passes this as artistKey to the
    // backend which queries begins_with — the GSI handler appends trailing slash.
    const artistSongPrefix = `${reEncodeSegment(artistName)}/${reEncodeSegment(songName)}`;
    let songs = await getArtistAnalyses(artistSongPrefix);

    // %2B fallback: if no results, try replacing %2B with - (migration compat)
    if (songs.length === 0 && artistSongPrefix.includes('%2B')) {
        songs = await getArtistAnalyses(artistSongPrefix.replaceAll('%2B', '-'));
    }

    if (songs.length === 0) {
        const requestHeaders = await headers();
        const { ua, ip } = getRequestContext(requestHeaders);
        const now = new Date();
        void analyticsStorage.writeSongNotFoundEvent({
            date: now.toISOString().split('T')[0],
            timestamp: now.toISOString(),
            hashedIp: hashValue(ip),
            ...parseUserAgent(ua),
            songKey: artistSongPrefix,
        });
        notFound();
    }

    // Redirect to the most recent matching analysis (songs sorted newest-first by GSI)
    permanentRedirect(`/analysis/${songs[0].songKey}`);
}

export async function generateMetadata({ params }: PageProps) {
    const { artistName, songName } = await params;
    const safeDecodeSegment = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
    const artist = safeDecodeSegment(artistName).replace(/-/g, ' ');
    const song = safeDecodeSegment(songName).replace(/-/g, ' ');
    return {
        title: `${song} by ${artist} | LyricsRay`,
    };
}
