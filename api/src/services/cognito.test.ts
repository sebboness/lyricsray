import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../util/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoService } from './cognito';
import { ApiError } from '../util/errors';

describe('CognitoService', () => {
  let mockSend: any;
  let service: CognitoService;

  beforeEach(() => {
    mockSend = vi.fn();
    const client = { send: mockSend } as unknown as CognitoIdentityProviderClient;
    service = new CognitoService('client-id', 'client-secret', client);
  });

  describe('initiateLogin', () => {
    it('returns a challenge when Cognito responds with EMAIL_OTP', async () => {
      mockSend.mockResolvedValue({ ChallengeName: 'EMAIL_OTP', Session: 'sess-123' });

      const result = await service.initiateLogin('admin', 'correct-password');

      expect(result).toEqual({ type: 'challenge', challenge: { challengeName: 'EMAIL_OTP', session: 'sess-123' } });
    });

    it('returns tokens directly if Cognito skips the challenge', async () => {
      mockSend.mockResolvedValue({
        AuthenticationResult: { IdToken: 'id', AccessToken: 'acc', RefreshToken: 'ref', ExpiresIn: 3600 },
      });

      const result = await service.initiateLogin('admin', 'correct-password');

      expect(result).toEqual({
        type: 'tokens',
        tokens: { idToken: 'id', accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600 },
      });
    });

    it('maps NotAuthorizedException to a generic bad-request error', async () => {
      const err = new Error('bad creds');
      err.name = 'NotAuthorizedException';
      mockSend.mockRejectedValue(err);

      await expect(service.initiateLogin('admin', 'wrong')).rejects.toThrow(ApiError);
      await expect(service.initiateLogin('admin', 'wrong')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('maps TooManyRequestsException to a 429', async () => {
      const err = new Error('slow down');
      err.name = 'TooManyRequestsException';
      mockSend.mockRejectedValue(err);

      await expect(service.initiateLogin('admin', 'wrong')).rejects.toMatchObject({ statusCode: 429 });
    });

    it('throws internal error when neither a challenge nor tokens are returned', async () => {
      mockSend.mockResolvedValue({});

      await expect(service.initiateLogin('admin', 'pw')).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  describe('respondToEmailOtpChallenge', () => {
    it('returns tokens on success', async () => {
      mockSend.mockResolvedValue({
        AuthenticationResult: { IdToken: 'id', AccessToken: 'acc', RefreshToken: 'ref', ExpiresIn: 3600 },
      });

      const tokens = await service.respondToEmailOtpChallenge('admin', 'sess-123', '123456');

      expect(tokens).toEqual({ idToken: 'id', accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600 });
    });

    it('throws a bad-request error when Cognito rejects the code', async () => {
      const err = new Error('bad code');
      err.name = 'CodeMismatchException';
      mockSend.mockRejectedValue(err);

      await expect(service.respondToEmailOtpChallenge('admin', 'sess-123', 'wrong')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws a bad-request error when no AuthenticationResult is returned', async () => {
      mockSend.mockResolvedValue({});

      await expect(service.respondToEmailOtpChallenge('admin', 'sess-123', '123456')).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('refresh', () => {
    it('returns fresh tokens on success', async () => {
      mockSend.mockResolvedValue({
        AuthenticationResult: { IdToken: 'new-id', AccessToken: 'new-acc', ExpiresIn: 3600 },
      });

      const tokens = await service.refresh('admin', 'valid-refresh-token');

      expect(tokens).toMatchObject({ idToken: 'new-id', accessToken: 'new-acc', expiresIn: 3600 });
    });

    it('throws a 401 when Cognito rejects the refresh token', async () => {
      const err = new Error('refresh token revoked');
      err.name = 'NotAuthorizedException';
      mockSend.mockRejectedValue(err);

      await expect(service.refresh('admin', 'stale-token')).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws a 401 when no AuthenticationResult is returned', async () => {
      mockSend.mockResolvedValue({});

      await expect(service.refresh('admin', 'some-token')).rejects.toMatchObject({ statusCode: 401 });
    });
  });
});
