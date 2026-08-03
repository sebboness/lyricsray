import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../util/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const mockVerify = vi.fn();

vi.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: vi.fn(() => ({ verify: mockVerify })),
  },
}));

describe('verifyIdToken', () => {
  beforeEach(() => {
    vi.resetModules();
    mockVerify.mockReset();
  });

  it('returns the verified claims on a valid token', async () => {
    mockVerify.mockResolvedValue({ sub: 'user-1', email: 'admin@example.com', 'cognito:username': 'admin' });

    const { verifyIdToken } = await import('./verifyJwt');
    const claims = await verifyIdToken('valid-token');

    expect(claims).toMatchObject({ sub: 'user-1', email: 'admin@example.com' });
  });

  it('returns null when verification throws', async () => {
    mockVerify.mockRejectedValue(new Error('signature invalid'));

    const { verifyIdToken } = await import('./verifyJwt');
    const claims = await verifyIdToken('tampered-token');

    expect(claims).toBeNull();
  });
});
