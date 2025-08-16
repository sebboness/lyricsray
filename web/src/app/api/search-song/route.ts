// app/api/search-song/route.ts

import { LrcLibApi, SongSearchResult as LrcLibSongSearchResult } from '@/services/lrclib';
import { logPrefix } from '@/util/log';
import { NextRequest, NextResponse } from 'next/server';

interface SearchSongRequest {
    songName: string;
    artist: string;
}

interface SongSearchResult {
    id: string;
    artist: string;
    album?: string;
    lyrics: string;
    thumbnail?: string;
    title: string;
}

interface SearchSongResponse {
    songs: SongSearchResult[];
    error?: string;
}

const module = "search-song";

export async function POST(request: NextRequest) {
    try {
        const body: SearchSongRequest = await request.json();
        const { songName, artist } = body;

        if (!songName?.trim() || !artist?.trim()) {
            return NextResponse.json(
                { error: 'Song name and artist are required' },
                { status: 400 }
            );
        }

        const api = LrcLibApi.getInstance();
        const results = await api.searchLyrics(songName.trim(), artist.trim());

        console.debug(`${logPrefix(module)} found songs`, results);

        // Transform Genius API response to our format
        const songs: SongSearchResult[] = results
            .filter((hit: LrcLibSongSearchResult) => !!hit.plainLyrics)
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
        console.error('Error in search-song endpoint:', error);
        return NextResponse.json(
            { error: 'Failed to search songs. Please try pasting lyrics directly.' },
            { status: 500 }
        );
    }
}