import { logger } from '@/logger/logger';
import { ApiRequestError, apiPostPublic } from '@/lib/api';
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
    relevance: number;
    thumbnail?: string;
    title: string;
}

interface SearchSongResponse {
    songs: SongSearchResult[];
    error?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: SearchSongRequest = await request.json();

        const { data } = await apiPostPublic<SearchSongResponse>('/v1/search-song', body);

        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof ApiRequestError) {
            return NextResponse.json(
                { error: error.errors[0] ?? error.message },
                { status: error.statusCode }
            );
        }

        logger.error('Error in search-song endpoint:', error);
        return NextResponse.json(
            { error: 'Failed to search songs. Please try pasting lyrics directly.' },
            { status: 500 }
        );
    }
}
