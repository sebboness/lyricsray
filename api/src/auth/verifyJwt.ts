import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { logger } from '../util/logger';

export interface VerifiedIdTokenClaims {
  sub: string;
  email?: string;
  'cognito:username'?: string;
  name?: string;
}

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID ?? '',
      tokenUse: 'id',
      clientId: process.env.COGNITO_CLIENT_ID ?? '',
    });
  }
  return verifier;
}

/**
 * Verifies a Cognito id token's signature, expiry, audience, and issuer against the
 * pool's JWKS. There is no API Gateway Cognito authorizer in front of admin routes
 * (they ride the same public /v1/{proxy+} catch-all as everything else), so this is
 * the only place the token is actually checked — returns null rather than throwing so
 * callers can produce a clean 401 without leaking verification internals.
 */
export async function verifyIdToken(token: string): Promise<VerifiedIdTokenClaims | null> {
  try {
    const payload = await getVerifier().verify(token);
    return payload as unknown as VerifiedIdTokenClaims;
  } catch (err) {
    logger.warn('id token verification failed', { err: err instanceof Error ? err.message : err });
    return null;
  }
}
