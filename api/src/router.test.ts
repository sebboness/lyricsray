import { describe, it, expect, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { Router } from './router';
import { ApiError } from './util/errors';

function makeEvent(method: string, path: string, headers: Record<string, string> = {}): APIGatewayProxyEvent {
  return { httpMethod: method, path, headers } as APIGatewayProxyEvent;
}

describe('Router', () => {
  it('dispatches to the matching handler', async () => {
    const router = new Router();
    const handler = vi.fn().mockResolvedValue({ statusCode: 200, headers: {}, body: '{}' });
    router.get('/v1/health', handler);

    await router.dispatch(makeEvent('GET', '/v1/health'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('extracts path params', async () => {
    const router = new Router();
    let capturedParams: Record<string, string> = {};
    router.get('/v1/analyze-song/:songKey', async (_event, params) => {
      capturedParams = params;
      return { statusCode: 200, headers: {}, body: '{}' };
    });

    await router.dispatch(makeEvent('GET', '/v1/analyze-song/abc123'));

    expect(capturedParams).toEqual({ songKey: 'abc123' });
  });

  it('returns 404 when no route matches', async () => {
    const router = new Router();
    const result = await router.dispatch(makeEvent('GET', '/v1/nope'));
    expect(result.statusCode).toBe(404);
  });

  it('responds to OPTIONS without invoking a handler', async () => {
    const router = new Router();
    const handler = vi.fn();
    router.get('/v1/health', handler);

    const result = await router.dispatch(makeEvent('OPTIONS', '/v1/health'));

    expect(result.statusCode).toBe(204);
    expect(handler).not.toHaveBeenCalled();
  });

  it('converts a thrown ApiError into the matching status code', async () => {
    const router = new Router();
    router.get('/v1/boom', async () => {
      throw ApiError.badRequest('bad input');
    });

    const result = await router.dispatch(makeEvent('GET', '/v1/boom'));

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).errors).toEqual(['bad input']);
  });
});
