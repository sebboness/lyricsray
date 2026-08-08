import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDynamoDbClient } from '../storage/dynamodb';
import { AnalysisResultStorage } from '../storage/analysisResultStorage';
import { ApiError } from '../util/errors';
import { ok, fromError } from '../util/response';
import { logger } from '../util/logger';
import { SongItem } from '../types/songItem';

const ddbClient = getDynamoDbClient();
const analysisResultDb = new AnalysisResultStorage(ddbClient);

export async function getArtistAnalysesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const rawArtistKey = event.queryStringParameters?.artistKey;
    if (!rawArtistKey) {
      throw ApiError.badRequest('artistKey parameter is required');
    }

    // If artistKey contains a '/', treat it as a song-level prefix lookup:
    // e.g. "Ariana-Grande/34%2B35" → query GSI for "Ariana-Grande", filter by prefix.
    const slashIdx = rawArtistKey.indexOf('/');
    const artistKey = slashIdx !== -1 ? rawArtistKey.slice(0, slashIdx) : rawArtistKey;
    const songPrefix = slashIdx !== -1 ? rawArtistKey : null;

    // Use a higher limit for prefix-filtered lookups to avoid missing the target song
    const limit = songPrefix ? 200 : 50;
    const results = await analysisResultDb.getAnalysesByArtist(artistKey, limit);
    logger.info('retrieved artist analyses', { artistKey, songPrefix, count: results.length });

    const prefix = songPrefix ? `${songPrefix}/` : null;
    const songs: SongItem[] = results
      .filter(item =>
        item.song?.songName &&
        item.song?.artistName &&
        (!prefix || item.songKey.startsWith(prefix))
      )
      .map(item => ({
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
