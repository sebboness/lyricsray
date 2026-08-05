import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Handler } from '../router';
import { AuthorizerInfo } from '../auth/context';
import { verifyIdToken } from '../auth/verifyJwt';
import { ApiError } from '../util/errors';
import { unauthorized } from '../util/response';

export type AuthedHandler = (
  event: APIGatewayProxyEvent,
  authInfo: AuthorizerInfo,
  params: Record<string, string>,
) => Promise<APIGatewayProxyResult>;

function extractBearerToken(event: APIGatewayProxyEvent): string | null {
  const header = event.headers?.Authorization ?? event.headers?.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

/**
 * Gates an admin route behind a verified Cognito id token. There's no API Gateway
 * authorizer in front of admin routes (see api/index.ts), so this is the only place
 * the token is actually checked.
 */
export function requireAuth(handler: AuthedHandler): Handler {
  return async (event, params) => {
    const origin = event.headers?.Origin ?? event.headers?.origin;
    const token = extractBearerToken(event);
    if (!token) return unauthorized(ApiError.unauthorized(), origin);

    const claims = await verifyIdToken(token);
    const authInfo = new AuthorizerInfo(claims);
    if (!authInfo.hasInfo()) return unauthorized(ApiError.unauthorized(), origin);

    return handler(event, authInfo, params);
  };
}
