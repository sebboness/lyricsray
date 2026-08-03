import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { optionsResponse, fromError } from './util/response';

export type Handler = (
  event: APIGatewayProxyEvent,
  params: Record<string, string>,
) => Promise<APIGatewayProxyResult>;

interface Route {
  method: string;
  pattern: string;
  handler: Handler;
}

function matchPath(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const rp = pathParts[i];

    if (pp.startsWith(':')) {
      params[pp.slice(1)] = decodeURIComponent(rp);
    } else if (pp !== rp) {
      return null;
    }
  }

  return params;
}

// LyricsRay has no user auth — every route is public (Altcha CAPTCHA is the only
// bot-verification layer, applied per-handler where needed).
export class Router {
  private readonly routes: Route[] = [];

  add(method: string, pattern: string, handler: Handler): this {
    this.routes.push({ method: method.toUpperCase(), pattern, handler });
    return this;
  }

  get(pattern: string, handler: Handler): this {
    return this.add('GET', pattern, handler);
  }

  post(pattern: string, handler: Handler): this {
    return this.add('POST', pattern, handler);
  }

  async dispatch(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const origin = event.headers?.Origin ?? event.headers?.origin;
    const method = event.httpMethod?.toUpperCase() ?? '';
    const path = event.path ?? '/';

    if (method === 'OPTIONS') {
      return optionsResponse(origin);
    }

    for (const route of this.routes) {
      if (route.method !== method) continue;

      const params = matchPath(route.pattern, path);
      if (params === null) continue;

      try {
        return await route.handler(event, params);
      } catch (err) {
        return fromError(err, origin);
      }
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'FAILURE', errors: ['not found'], message: `${method} ${path}` }),
    };
  }
}
