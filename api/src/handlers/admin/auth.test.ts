import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';

const { mockInitiateLogin, mockRespondToEmailOtpChallenge, mockRefresh } = vi.hoisted(() => ({
  mockInitiateLogin: vi.fn(),
  mockRespondToEmailOtpChallenge: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock('../../util/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('../../services/cognito', () => ({
  CognitoService: {
    fromEnv: vi.fn(() => ({
      initiateLogin: mockInitiateLogin,
      respondToEmailOtpChallenge: mockRespondToEmailOtpChallenge,
      refresh: mockRefresh,
    })),
  },
}));

import { loginHandler, verifyHandler, refreshHandler } from './auth';

function makeEvent(body: object): APIGatewayProxyEvent {
  return { body: JSON.stringify(body), headers: {} } as APIGatewayProxyEvent;
}

async function call(handler: typeof loginHandler, body: object) {
  const result = await handler(makeEvent(body));
  return { status: result.statusCode, body: JSON.parse(result.body) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('loginHandler', () => {
  it('returns 400 when username is missing', async () => {
    const { status, body } = await call(loginHandler, { password: 'pw' });

    expect(status).toBe(400);
    expect(body.errors).toContain('Username and password are required');
    expect(mockInitiateLogin).not.toHaveBeenCalled();
  });

  it('returns 400 when password is missing', async () => {
    const { status } = await call(loginHandler, { username: 'admin' });

    expect(status).toBe(400);
  });

  it('returns the challenge on success', async () => {
    mockInitiateLogin.mockResolvedValue({ type: 'challenge', challenge: { challengeName: 'EMAIL_OTP', session: 'sess-123' } });

    const { status, body } = await call(loginHandler, { username: 'admin', password: 'correct' });

    expect(status).toBe(200);
    expect(body.data).toMatchObject({ challengeName: 'EMAIL_OTP', session: 'sess-123', tokens: null });
    expect(mockInitiateLogin).toHaveBeenCalledWith('admin', 'correct');
  });

  it('propagates the generic error message on invalid credentials', async () => {
    const { ApiError } = await import('../../util/errors');
    mockInitiateLogin.mockRejectedValue(ApiError.badRequest('Invalid username or password'));

    const { status, body } = await call(loginHandler, { username: 'admin', password: 'wrong' });

    expect(status).toBe(400);
    expect(body.errors).toContain('Invalid username or password');
  });
});

describe('verifyHandler', () => {
  it('returns 400 when required fields are missing', async () => {
    const { status, body } = await call(verifyHandler, { username: 'admin' });

    expect(status).toBe(400);
    expect(body.errors).toContain('Username, session, and code are required');
    expect(mockRespondToEmailOtpChallenge).not.toHaveBeenCalled();
  });

  it('returns tokens on success', async () => {
    mockRespondToEmailOtpChallenge.mockResolvedValue({
      idToken: 'id', accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600,
    });

    const { status, body } = await call(verifyHandler, { username: 'admin', session: 'sess-123', code: '123456' });

    expect(status).toBe(200);
    expect(body.data.tokens).toMatchObject({ idToken: 'id' });
    expect(mockRespondToEmailOtpChallenge).toHaveBeenCalledWith('admin', 'sess-123', '123456');
  });

  it('returns 400 when the code is invalid', async () => {
    const { ApiError } = await import('../../util/errors');
    mockRespondToEmailOtpChallenge.mockRejectedValue(ApiError.badRequest('Invalid or expired code'));

    const { status, body } = await call(verifyHandler, { username: 'admin', session: 'sess-123', code: 'wrong' });

    expect(status).toBe(400);
    expect(body.errors).toContain('Invalid or expired code');
  });
});

describe('refreshHandler', () => {
  it('returns 400 when required fields are missing', async () => {
    const { status, body } = await call(refreshHandler, { username: 'admin' });

    expect(status).toBe(400);
    expect(body.errors).toContain('Username and refreshToken are required');
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('returns fresh tokens on success', async () => {
    mockRefresh.mockResolvedValue({ idToken: 'new-id', accessToken: 'new-acc', refreshToken: '', expiresIn: 3600 });

    const { status, body } = await call(refreshHandler, { username: 'admin', refreshToken: 'valid-refresh-token' });

    expect(status).toBe(200);
    expect(body.data.tokens).toMatchObject({ idToken: 'new-id' });
    expect(mockRefresh).toHaveBeenCalledWith('admin', 'valid-refresh-token');
  });

  it('returns 401 when the refresh token is rejected', async () => {
    const { ApiError } = await import('../../util/errors');
    mockRefresh.mockRejectedValue(ApiError.unauthorized('Session expired, please sign in again'));

    const { status, body } = await call(refreshHandler, { username: 'admin', refreshToken: 'stale-token' });

    expect(status).toBe(401);
    expect(body.errors).toContain('Session expired, please sign in again');
  });
});
