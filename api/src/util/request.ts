import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Resolves the client IP for an API Gateway request.
 *
 * Unlike the old Next.js/Amplify setup (which trusted forwarded headers set by
 * Amplify's compute layer), API Gateway's `requestContext.identity.sourceIp` is
 * the authoritative, unspoofable client IP — it must be preferred over any
 * client-supplied forwarded header, since this value feeds the rate limiter and
 * a spoofable IP would allow rate-limit bypass.
 */
export function getClientIp(event: APIGatewayProxyEvent): string {
  const sourceIp = event.requestContext?.identity?.sourceIp;
  if (sourceIp) return sourceIp;

  const headers = event.headers ?? {};
  const forwarded = headers['x-forwarded-for'] ?? headers['X-Forwarded-For'];
  if (forwarded) return forwarded.split(',')[0].trim();

  return 'unknown';
}
