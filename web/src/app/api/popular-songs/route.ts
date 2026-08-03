import { NextResponse } from 'next/server';
import { logger } from '@/logger/logger';
import { apiGetPublic } from '@/lib/api';

interface RecentAnalysisItem {
    songKey: string;
    songName: string;
    artistName: string;
    recommendedAge: number;
    appropriate: number;
    date: string;
}

export async function GET() {
    try {
        const { data } = await apiGetPublic<{ songs: RecentAnalysisItem[] }>('/v1/popular-songs?limit=20');
        return NextResponse.json(data.songs);
    } catch (error) {
        logger.error('Error retrieving recent analyses:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve recent analyses' },
            { status: 500 }
        );
    }
}
