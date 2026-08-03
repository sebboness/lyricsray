import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoService } from '../../services/cognito';
import { ApiError } from '../../util/errors';
import { ok, fromError } from '../../util/response';
import { logger } from '../../util/logger';

interface LoginRequest {
  username: string;
  password: string;
}

interface VerifyRequest {
  username: string;
  session: string;
  code: string;
}

interface RefreshRequest {
  username: string;
  refreshToken: string;
}

export async function loginHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const body: LoginRequest = JSON.parse(event.body || '{}');
    const { username, password } = body;

    if (!username?.trim() || !password) {
      throw ApiError.badRequest('Username and password are required');
    }

    const result = await CognitoService.fromEnv().initiateLogin(username.trim(), password);

    if (result.type === 'tokens') {
      return ok({ challengeName: null, session: null, tokens: result.tokens }, origin);
    }

    return ok({ challengeName: result.challenge.challengeName, session: result.challenge.session, tokens: null }, origin);
  } catch (err) {
    logger.error('error in admin login handler', { err });
    return fromError(err, origin);
  }
}

export async function verifyHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const body: VerifyRequest = JSON.parse(event.body || '{}');
    const { username, session, code } = body;

    if (!username?.trim() || !session || !code?.trim()) {
      throw ApiError.badRequest('Username, session, and code are required');
    }

    const tokens = await CognitoService.fromEnv().respondToEmailOtpChallenge(username.trim(), session, code.trim());

    return ok({ tokens }, origin);
  } catch (err) {
    logger.error('error in admin verify handler', { err });
    return fromError(err, origin);
  }
}

export async function refreshHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const body: RefreshRequest = JSON.parse(event.body || '{}');
    const { username, refreshToken } = body;

    if (!username?.trim() || !refreshToken) {
      throw ApiError.badRequest('Username and refreshToken are required');
    }

    const tokens = await CognitoService.fromEnv().refresh(username.trim(), refreshToken);

    return ok({ tokens }, origin);
  } catch (err) {
    logger.error('error in admin refresh handler', { err });
    return fromError(err, origin);
  }
}
