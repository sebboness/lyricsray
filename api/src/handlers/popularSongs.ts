import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDynamoDbClient } from '../storage/dynamodb';
import { AnalysisResultStorage } from '../storage/analysisResultStorage';
import { ok, fromError } from '../util/response';

const ddbClient = getDynamoDbClient();
const analysisResultDb = new AnalysisResultStorage(ddbClient);

interface PopularSongItem {
  songKey: string;
  songName: string;
  artistName: string;
  recommendedAge: number;
  themes: string[];
  appropriate: number;
  date: string;
}

export async function popularSongsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const maxItems = parseInt(event.queryStringParameters?.limit ?? '5', 10) || 5;
    const recentAnalyses = await analysisResultDb.getRecentAnalyses(maxItems * 4, 'POPULAR');

    const formatted: PopularSongItem[] = recentAnalyses
      .filter((item) => item.song?.songName && item.song?.artistName && item.recommendedAge && item.appropriate && item.date)
      .map((item) => ({
        songKey: item.songKey,
        songName: item.song.songName || 'Unknown Song',
        artistName: item.song.artistName || 'Unknown Artist',
        recommendedAge: item.recommendedAge,
        themes: item.themes || [],
        appropriate: item.appropriate,
        date: item.date,
      }));

    // Randomize and limit results (matches prior homepage behavior)
    const songs = formatted.sort(() => 0.5 - Math.random()).slice(0, maxItems);

    return ok({ songs }, origin);
  } catch (err) {
    return fromError(err, origin);
  }
}
