import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Router } from './src/router';
import { healthHandler } from './src/handlers/health';
import { altchaChallengeHandler } from './src/handlers/altchaChallenge';
import { searchSongHandler } from './src/handlers/searchSong';
import { analyzeSongHandler } from './src/handlers/analyzeSong';
import { getAnalysisHandler } from './src/handlers/getAnalysis';
import { popularSongsHandler } from './src/handlers/popularSongs';
import { recentSearchesHandler } from './src/handlers/recentSearches';
import { logger } from './src/util/logger';

const router = new Router();

// LyricsRay has no user auth — every route is public. Altcha CAPTCHA verification
// happens inside the search-song/analyze-song handlers themselves.
router.get('/v1/health', healthHandler);
router.get('/v1/altcha/challenge', altchaChallengeHandler);
router.post('/v1/search-song', searchSongHandler);
router.post('/v1/analyze-song', analyzeSongHandler);
router.get('/v1/analyze-song/:songKey', getAnalysisHandler);
router.get('/v1/popular-songs', popularSongsHandler);
router.get('/v1/recent-searches', recentSearchesHandler);

export const handler = async (event: APIGatewayProxyEvent, _context: Context): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext?.requestId;
  const method = event.httpMethod;
  const path = event.path;

  logger.info('request', { method, path, requestId });

  const response = await router.dispatch(event);

  logger.info('response', { method, path, requestId, status: response.statusCode });

  return response;
};
