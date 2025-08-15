// app/api/search-song/route.ts

import { NextRequest, NextResponse } from 'next/server';

interface SearchSongRequest {
    songName: string;
    artist: string;
}

interface SongSearchResult {
    id: string;
    title: string;
    artist: string;
    album?: string;
    thumbnail?: string;
}

interface SearchSongResponse {
    songs: SongSearchResult[];
    error?: string;
}

async function searchGeniusSongs(songName: string, artist: string): Promise<SongSearchResult[]> {
    try {
        console.log("genius apikey", process.env.GENIUS_API_ACCESS_TOKEN);

        const query = `${songName} ${artist}`;
        const response = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
        headers: {
            'Authorization': `Bearer ${process.env.GENIUS_API_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        });

        if (!response.ok) {
        throw new Error(`Genius API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.response?.hits) {
            return [];
        }

        // Transform Genius API response to our format
        const songs: SongSearchResult[] = data.response.hits
            .filter((hit: any) => hit.result?.id && hit.result?.title && hit.result?.primary_artist?.name)
            .slice(0, 10) // Limit to 10 results
            .map((hit: any) => ({
                id: hit.result.id.toString(),
                title: hit.result.title,
                artist: hit.result.primary_artist.name,
                album: hit.result.album?.name,
                thumbnail: hit.result.song_art_image_thumbnail_url || hit.result.header_image_thumbnail_url
            }));

        return songs;

    } catch (error) {
        console.error('Error searching Genius:', error);
        throw new Error('Failed to search songs from Genius API');
    }
    }

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

        // Check if Genius API key is available
        if (!process.env.GENIUS_API_ACCESS_TOKEN) {
        return NextResponse.json(
            { error: 'Genius API key not configured. Please paste lyrics directly.' },
            { status: 500 }
        );
        }

        const songs = await searchGeniusSongs(songName.trim(), artist.trim());

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