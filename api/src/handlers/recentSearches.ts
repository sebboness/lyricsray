import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDynamoDbClient } from '../storage/dynamodb';
import { AnalysisResultStorage } from '../storage/analysisResultStorage';
import { ok, fromError } from '../util/response';

const ddbClient = getDynamoDbClient();
const analysisResultDb = new AnalysisResultStorage(ddbClient);

const RECENT_SEARCHES_LIMIT = 50;
const RECENT_SEARCHES_FETCH_LIMIT = 100;

interface RecentSearchItem {
  songKey: string;
  songName: string;
  artistName: string;
  recommendedAge: number;
  themes: string[];
  appropriate: number;
  date: string;
}

export async function recentSearchesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const maxItems = parseInt(event.queryStringParameters?.limit ?? '', 10) || RECENT_SEARCHES_LIMIT;
    const recentAnalyses = await analysisResultDb.getRecentAnalyses(RECENT_SEARCHES_FETCH_LIMIT, 'ANALYSIS');

    const songs: RecentSearchItem[] = recentAnalyses
      // Excludes analyses submitted as raw lyrics (no song search), which have no song/artist name
      .filter((item) => item.song?.songName && item.song?.artistName && item.recommendedAge && item.appropriate && item.date)
      .slice(0, maxItems)
      .map((item) => ({
        songKey: item.songKey,
        songName: item.song.songName || 'Unknown Song',
        artistName: item.song.artistName || 'Unknown Artist',
        recommendedAge: item.recommendedAge,
        themes: item.themes || [],
        appropriate: item.appropriate,
        date: item.date,
      }));

    return ok({ songs }, origin);
  } catch (err) {
    return fromError(err, origin);
  }
}
