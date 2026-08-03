import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';

const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('../auth/verifyJwt', () => ({ verifyIdToken: mockVerifyIdToken }));

import { requireAuth } from './requireAuth';

function makeEvent(headers: Record<string, string> = {}): APIGatewayProxyEvent {
  return { headers, body: null } as unknown as APIGatewayProxyEvent;
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no Authorization header is present', async () => {
    const handler = vi.fn();
    const guarded = requireAuth(handler);

    const result = await guarded(makeEvent(), {});

    expect(result.statusCode).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when the token fails verification', async () => {
    mockVerifyIdToken.mockResolvedValue(null);
    const handler = vi.fn();
    const guarded = requireAuth(handler);

    const result = await guarded(makeEvent({ Authorization: 'Bearer bad-token' }), {});

    expect(result.statusCode).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls the wrapped handler with AuthorizerInfo when the token verifies', async () => {
    mockVerifyIdToken.mockResolvedValue({ sub: 'user-1', email: 'admin@example.com' });
    const handler = vi.fn().mockResolvedValue({ statusCode: 200, headers: {}, body: '{}' });
    const guarded = requireAuth(handler);

    const event = makeEvent({ Authorization: 'Bearer good-token' });
    await guarded(event, { id: '1' });

    expect(handler).toHaveBeenCalledTimes(1);
    const [calledEvent, authInfo, params] = handler.mock.calls[0];
    expect(calledEvent).toBe(event);
    expect(authInfo.getUserId()).toBe('user-1');
    expect(params).toEqual({ id: '1' });
  });

  it('accepts a lowercase authorization header', async () => {
    mockVerifyIdToken.mockResolvedValue({ sub: 'user-1' });
    const handler = vi.fn().mockResolvedValue({ statusCode: 200, headers: {}, body: '{}' });
    const guarded = requireAuth(handler);

    await guarded(makeEvent({ authorization: 'Bearer good-token' }), {});

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
