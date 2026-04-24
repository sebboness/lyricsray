import { getDynamoDbClient } from '@/storage/dynamodb';
import { AnalysisResultStorage } from '@/storage/AnalysisResultStorage';

export interface PopularSongItem {
    songKey: string;
    songName: string;
    artistName: string;
    recommendedAge: number;
    themes: string[];
    appropriate: number;
    date: string;
}

export async function getPopularSongs(maxItems: number = 5): Promise<PopularSongItem[]> {
    try {
        const ddbClient = getDynamoDbClient();
        const analysisResultDb = new AnalysisResultStorage(ddbClient);

        const recentAnalyses = await analysisResultDb.getRecentAnalyses(maxItems * 4, "POPULAR");

        if (!recentAnalyses || recentAnalyses.length === 0) {
            return [];
        }

        // Transform the data for the frontend
        const formattedAnalyses: PopularSongItem[] = recentAnalyses
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
                themes: item.themes || [],
                appropriate: item.appropriate,
                date: item.date
            }));

        // Randomize and limit results
        return formattedAnalyses.sort(() => 0.5 - Math.random()).slice(0, maxItems);
    } catch (error) {
        console.error('Error fetching popular songs:', error);
        return [];
    }
}