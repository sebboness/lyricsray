import { getDynamoDbClient } from '@/storage/dynamodb';
import { AnalysisResultStorage } from '@/storage/AnalysisResultStorage';

export interface RecentSearchItem {
    songKey: string;
    songName: string;
    artistName: string;
    recommendedAge: number;
    themes: string[];
    appropriate: number;
    date: string;
}

const RECENT_SEARCHES_LIMIT = 50;
const RECENT_SEARCHES_FETCH_LIMIT = 100;

export async function getRecentSearches(maxItems: number = RECENT_SEARCHES_LIMIT): Promise<RecentSearchItem[]> {
    try {
        const ddbClient = getDynamoDbClient();
        const analysisResultDb = new AnalysisResultStorage(ddbClient);

        const recentAnalyses = await analysisResultDb.getRecentAnalyses(RECENT_SEARCHES_FETCH_LIMIT, "ANALYSIS");

        if (!recentAnalyses || recentAnalyses.length === 0) {
            return [];
        }

        return recentAnalyses
            .filter(item =>
                // Excludes analyses submitted as raw lyrics (no song search), which have no song/artist name
                item.song?.songName &&
                item.song?.artistName &&
                item.recommendedAge &&
                item.appropriate &&
                item.date
            )
            .slice(0, maxItems)
            .map(item => ({
                songKey: item.songKey,
                songName: item.song.songName || 'Unknown Song',
                artistName: item.song.artistName || 'Unknown Artist',
                recommendedAge: item.recommendedAge,
                themes: item.themes || [],
                appropriate: item.appropriate,
                date: item.date
            }));
    } catch (error) {
        console.error('Error fetching recent searches:', error);
        return [];
    }
}
