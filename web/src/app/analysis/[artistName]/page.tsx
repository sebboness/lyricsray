import { notFound, permanentRedirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getArtistAnalyses } from '@/lib/getArtistAnalyses';
import { ArtistLandingDisplay } from './ArtistLandingDisplay';
import { getDynamoDbClient } from '@/storage/dynamodb';
import { AnalyticsEventStorage } from '@/storage/AnalyticsEventStorage';
import { hashValue } from '@/util/hash';
import { parseUserAgent } from '@/util/userAgent';
import { getRequestContext } from '@/util/request';

const analyticsStorage = new AnalyticsEventStorage(getDynamoDbClient());

interface PageProps {
    params: Promise<{ artistName: string }>;
}

function reEncodeSegment(segment: string): string {
    if (/%[0-9a-fA-F]{2}/.test(segment)) {
        try { segment = decodeURIComponent(segment); } catch { /* malformed, use as-is */ }
    }
    return encodeURIComponent(segment);
}

function parseLegacyKey(decoded: string): { artist: string; song: string; hash: string } | null {
    const pipeIdx = decoded.indexOf('|');
    const hashIdx = decoded.indexOf('#');
    if (pipeIdx === -1 || hashIdx === -1 || hashIdx <= pipeIdx) return null;
    return {
        artist: decoded.slice(0, pipeIdx),
        song: decoded.slice(pipeIdx + 1, hashIdx),
        hash: decoded.slice(hashIdx + 1),
    };
}

function safeDecodeSegment(segment: string): string {
    try { return decodeURIComponent(segment); } catch { return segment; }
}

export default async function ArtistLandingPage({ params }: PageProps) {
    const { artistName } = await params;
    const decoded = safeDecodeSegment(artistName);

    // Detect and redirect legacy single-segment keys (Artist|Song#hash)
    if (decoded.includes('|')) {
        const seg = (s: string) => encodeURIComponent(s).replace(/(%20)+/g, '-');

        // Full legacy key with hash present
        if (decoded.includes('#')) {
            const parsed = parseLegacyKey(decoded);
            if (parsed) {
                permanentRedirect(`/analysis/${seg(parsed.artist)}/${seg(parsed.song)}/${parsed.hash}`);
            }
        }

        // Hash was stripped by the browser as a URL fragment — look up by artist+song prefix
        const pipeIdx = decoded.indexOf('|');
        const artist = decoded.slice(0, pipeIdx);
        const song = decoded.slice(pipeIdx + 1);
        const prefix = `${seg(artist)}/${seg(song)}`;
        const matches = await getArtistAnalyses(prefix);
        if (matches.length > 0) {
            permanentRedirect(`/analysis/${matches[0].songKey}`);
        }

        const { ua, ip } = getRequestContext(await headers());
        const now = new Date();
        void analyticsStorage.writeSongNotFoundEvent({
            date: now.toISOString().split('T')[0],
            timestamp: now.toISOString(),
            hashedIp: hashValue(ip),
            ...parseUserAgent(ua),
            songKey: prefix,
        });
        notFound();
    }

    const artistKey = reEncodeSegment(artistName);
    const songs = await getArtistAnalyses(artistKey);

    if (songs.length === 0) {
        notFound();
    }

    const displayName = songs[0]?.artistName ?? decoded.replace(/-/g, ' ');
    return <ArtistLandingDisplay artistName={displayName} songs={songs} />;
}

export async function generateMetadata({ params }: PageProps) {
    const { artistName } = await params;
    const decoded = safeDecodeSegment(artistName).replace(/-/g, ' ');
    return {
        title: `${decoded} Song Analysis | LyricsRay`,
        description: `Browse LyricsRay's age-appropriateness analysis for songs by ${decoded}.`,
    };
}
