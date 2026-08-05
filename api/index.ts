import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Router } from './src/router';
import { healthHandler } from './src/handlers/health';
import { altchaChallengeHandler } from './src/handlers/altchaChallenge';
import { searchSongHandler } from './src/handlers/searchSong';
import { analyzeSongHandler } from './src/handlers/analyzeSong';
import { getAnalysisHandler } from './src/handlers/getAnalysis';
import { popularSongsHandler } from './src/handlers/popularSongs';
import { recentSearchesHandler } from './src/handlers/recentSearches';
import {
  loginHandler,
  newPasswordHandler,
  confirmForgotPasswordHandler,
  verifyHandler,
  refreshHandler,
} from './src/handlers/admin/auth';
import { logger } from './src/util/logger';

const router = new Router();

// Every public LyricsRay route is unauthenticated. Altcha CAPTCHA verification
// happens inside the search-song/analyze-song handlers themselves.
router.get('/v1/health', healthHandler);
router.get('/v1/altcha/challenge', altchaChallengeHandler);
router.post('/v1/search-song', searchSongHandler);
router.post('/v1/analyze-song', analyzeSongHandler);
router.get('/v1/analyze-song', getAnalysisHandler);
router.get('/v1/popular-songs', popularSongsHandler);
router.get('/v1/recent-searches', recentSearchesHandler);

// Admin routes ride the same public /v1/{proxy+} API Gateway catch-all as everything
// above — there's no Cognito authorizer at the edge. Login/new-password/verify/
// refresh are inherently public (they're how a token is obtained/renewed); any
// future admin route must be wrapped with requireAuth(...), which verifies the
// bearer id token in-Lambda.
router.post('/v1/admin/auth/login', loginHandler);
router.post('/v1/admin/auth/new-password', newPasswordHandler);
router.post('/v1/admin/auth/confirm-forgot-password', confirmForgotPasswordHandler);
router.post('/v1/admin/auth/verify', verifyHandler);
router.post('/v1/admin/auth/refresh', refreshHandler);

export const handler = async (event: APIGatewayProxyEvent, _context: Context): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext?.requestId;
  const method = event.httpMethod;
  const path = event.path;

  logger.info('request', { method, path, requestId });

  const response = await router.dispatch(event);

  logger.info('response', { method, path, requestId, status: response.statusCode });

  return response;
};
