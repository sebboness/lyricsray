import { NextResponse } from 'next/server';
import { logger } from '@/logger/logger';
import { logPrefix } from '@/util/log';
import { getDynamoDbClient } from '@/storage/dynamodb';
import { AnalysisResultStorage } from '@/storage/AnalysisResultStorage';

const moduleName = "popular-songs";

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
        const ddbClient = getDynamoDbClient();
        const analysisResultDb = new AnalysisResultStorage(ddbClient);

        const recentAnalyses = await analysisResultDb.getRecentAnalyses(20, "POPULAR");

        if (!recentAnalyses || recentAnalyses.length === 0) {
            return NextResponse.json([]);
        }

        // Transform the data for the frontend
        const formattedAnalyses: RecentAnalysisItem[] = recentAnalyses
            .filter(item =>
                item.song?.songName &&
                item.song?.artistName &&
                item.recommendedAge &&
                item.appropriate &&
                item.date
            )
            .map(item => ({
                songKey: item.songKey,
                songName: item.song.songName || 'Unknown Song',
                artistName: item.song.artistName || 'Unknown Artist',
                recommendedAge: item.recommendedAge,
                appropriate: item.appropriate,
                date: item.date
            }));

        logger.info(`${logPrefix(moduleName)} Retrieved ${formattedAnalyses.length} recent analyses`);

        return NextResponse.json(formattedAnalyses);

    } catch (error) {
        logger.error(`${logPrefix(moduleName)} Error retrieving recent analyses:`, error);
        return NextResponse.json(
            { error: 'Failed to retrieve recent analyses' },
            { status: 500 }
        );
    }
}