import { logger } from '@/logger/logger';
import { LrcLibApi, SongSearchResult as LrcLibSongSearchResult } from '@/services/lrclib';
import { verifyAltchaSolution } from '@/util/altcha';
import { logPrefix } from '@/util/log';
import { NextRequest, NextResponse } from 'next/server';

interface SearchSongRequest {
    altchaPayload: string;
    songName: string;
    artist: string;
}

interface SongSearchResult {
    id: string;
    artist?: string;
    album?: string;
    lyrics: string;
    thumbnail?: string;
    title: string;
}

interface SearchSongResponse {
    songs: SongSearchResult[];
    error?: string;
}

const logName = "search-song";

export async function POST(request: NextRequest) {
    try {
        const body: SearchSongRequest = await request.json();
        const { altchaPayload, songName, artist } = body;

        logger.info(`${logPrefix(logName)} altchaPayload`, altchaPayload);
        
        if (!altchaPayload || !await verifyAltchaSolution(altchaPayload)) {
            return NextResponse.json(
                { error: 'Human verification failed' },
                { status: 400 }
            );
        }

        if (!songName?.trim()) {
            return NextResponse.json(
                { error: 'Song name is required' },
                { status: 400 }
            );
        }

        const api = LrcLibApi.getInstance();
        const results = await api.searchLyrics(songName.trim(), artist?.trim());

        logger.info(`${logPrefix(logName)} found songs with lyrics`, results.filter((hit: LrcLibSongSearchResult) => !!hit.plainLyrics).length);

        const map = new Map();

        // Transform Genius API response to our format
        const songs: SongSearchResult[] = results
            .filter((hit: LrcLibSongSearchResult) => !!hit.plainLyrics)
            .filter((hit: LrcLibSongSearchResult) => {
                const key = `${hit.artistName} - ${hit.trackName}`;
                if (!map.has(key)) {
                    map.set(key, true);
                    return true;
                }
                return false;
            })
            .slice(0, 10) // Limit to 10 results
            .map((hit: LrcLibSongSearchResult) => ({
                id: hit.id.toString(),
                title: hit.trackName,
                artist: hit.artistName,
                album: hit.albumName,
                lyrics: hit.plainLyrics!,
                thumbnail: "" // TODO figure out how to display those
            }));

        const response: SearchSongResponse = {
            songs
        };

        return NextResponse.json(response);

    } catch (error) {
        logger.error('Error in search-song endpoint:', error);
        return NextResponse.json(
            { error: 'Failed to search songs. Please try pasting lyrics directly.' },
            { status: 500 }
        );
    }
}