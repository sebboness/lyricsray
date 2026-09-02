import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDynamoDbClient } from '../storage/dynamodb';
import { AnalysisResult, AnalysisResultStorage } from '../storage/analysisResultStorage';
import { ok, fromError } from '../util/response';
import { SongItem } from '../types/songItem';

const ddbClient = getDynamoDbClient();
const analysisResultDb = new AnalysisResultStorage(ddbClient);

const RECENT_SEARCHES_LIMIT = 50;
const RECENT_SEARCHES_FETCH_LIMIT = 100;

interface RecentSearchesCursor {
  entityType: string;
  date: string;
  songKey: string;
}

function encodeCursor(cursor: RecentSearchesCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
}

function isValid(item: AnalysisResult): boolean {
  return !!(item.song?.songName && item.song?.artistName && item.recommendedAge && item.appropriate && item.date);
}

export async function recentSearchesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const maxItems = parseInt(event.queryStringParameters?.limit ?? '', 10) || RECENT_SEARCHES_LIMIT;
    let exclusiveStartKey: Record<string, unknown> | undefined = decodeCursor(event.queryStringParameters?.cursor);

    const songs: SongItem[] = [];
    let nextCursor: string | undefined;

    while (songs.length <= maxItems) {
      const { items, lastEvaluatedKey } = await analysisResultDb.getRecentAnalysesPage(
        RECENT_SEARCHES_FETCH_LIMIT,
        'ANALYSIS',
        exclusiveStartKey,
      );

      for (const item of items) {
        if (!isValid(item)) continue;

        songs.push({
          songKey: item.songKey,
          songName: item.song.songName || 'Unknown Song',
          artistName: item.song.artistName || 'Unknown Artist',
          recommendedAge: item.recommendedAge,
          themes: item.themes || [],
          appropriate: item.appropriate,
          date: item.date,
        });

        if (songs.length > maxItems) {
          nextCursor = encodeCursor({ entityType: 'ANALYSIS', date: item.date, songKey: item.songKey });
          break;
        }
      }

      if (songs.length > maxItems || !lastEvaluatedKey) break;
      exclusiveStartKey = lastEvaluatedKey;
    }

    if (songs.length > maxItems) songs.pop();

    return ok({ songs, nextCursor }, origin);
  } catch (err) {
    return fromError(err, origin);
  }
}
