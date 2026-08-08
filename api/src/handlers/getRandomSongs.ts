import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDynamoDbClient } from '../storage/dynamodb';
import { AnalysisResultStorage } from '../storage/analysisResultStorage';
import { ok, fromError } from '../util/response';
import { logger } from '../util/logger';
import { SongItem } from '../types/songItem';

const ddbClient = getDynamoDbClient();
const analysisResultDb = new AnalysisResultStorage(ddbClient);

export async function getRandomSongsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const excludeSongKey = event.queryStringParameters?.excludeSongKey ?? undefined;

    const results = await analysisResultDb.getRandomSongs(excludeSongKey);
    logger.info('retrieved random songs', { count: results.length, excludeSongKey });

    const songs: SongItem[] = results.map(item => ({
      songKey: item.songKey,
      songName: item.song.songName!,
      artistName: item.song.artistName!,
      recommendedAge: item.recommendedAge,
      themes: item.themes ?? [],
      appropriate: item.appropriate,
      date: item.date,
    }));

    return ok({ songs }, origin);
  } catch (err) {
    return fromError(err, origin);
  }
}
