import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LrcLibApi, SongSearchResult as LrcLibSongSearchResult } from '../services/lrclib';
import { verifyAltchaSolution } from '../util/altcha';
import { ApiError } from '../util/errors';
import { ok, fromError } from '../util/response';
import { logger } from '../util/logger';

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

const normalize = (s: string) => s?.toLowerCase().trim() ?? '';

const relevanceScore = (hit: LrcLibSongSearchResult, songName: string, artist: string): number => {
  const title = normalize(hit.trackName);
  const hitArtist = normalize(hit.artistName);
  const queryTitle = normalize(songName);
  const queryArtist = normalize(artist);

  const exactTitleMatch = queryTitle === title;
  const exactArtistMatch = queryArtist === hitArtist;
  const titleMatch = title.includes(queryTitle);
  const artistMatch = queryArtist && hitArtist.includes(queryArtist);

  if (exactTitleMatch && exactArtistMatch) return 1;
  if (exactTitleMatch && queryArtist === '') return 2;
  if (titleMatch) return 3;
  if (artistMatch) return 4;
  return 5;
};

export async function searchSongHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const body: SearchSongRequest = JSON.parse(event.body || '{}');
    const { altchaPayload, songName, artist } = body;

    if (!altchaPayload || !(await verifyAltchaSolution(altchaPayload))) {
      throw ApiError.badRequest('Human verification failed');
    }

    if (!songName?.trim()) {
      throw ApiError.badRequest('Song name is required');
    }

    const api = LrcLibApi.getInstance();
    const results = await api.searchLyrics(songName.trim(), artist?.trim());

    const seen = new Map<string, boolean>();

    let songs: SongSearchResult[] = results
      .filter((hit) => !!hit.plainLyrics)
      .filter((hit) => {
        const key = `${hit.artistName} - ${hit.trackName}`;
        if (!seen.has(key)) {
          seen.set(key, true);
          return true;
        }
        return false;
      })
      .map((hit) => ({ ...hit, relevance: relevanceScore(hit, songName, artist) }))
      .sort((a, b) => a.relevance - b.relevance)
      .slice(0, 20)
      .map((hit) => ({
        id: hit.id.toString(),
        title: hit.trackName,
        artist: hit.artistName,
        album: hit.albumName,
        lyrics: hit.plainLyrics!,
        relevance: hit.relevance,
        thumbnail: '',
      }));

    const exactMatches = songs.filter((hit) => hit.relevance === 1);
    if (exactMatches.length > 0) songs = [exactMatches[0]];

    return ok({ songs }, origin);
  } catch (err) {
    logger.error('error in search-song handler', { err });
    return fromError(err, origin);
  }
}
