import * as crypto from 'crypto';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  ConfirmForgotPasswordCommand,
  AuthFlowType,
  ChallengeNameType,
  InitiateAuthCommandOutput,
  RespondToAuthChallengeCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { ApiError } from '../util/errors';

// The only challenges this login flow knows how to continue. NEW_PASSWORD_REQUIRED
// happens the first time an admin signs in after being created with a temporary
// password; EMAIL_OTP is the MFA step every sign-in goes through after that.
const SUPPORTED_CHALLENGES = new Set<string>([ChallengeNameType.NEW_PASSWORD_REQUIRED, ChallengeNameType.EMAIL_OTP]);

// Synthetic "challenge name" surfaced to the client when Cognito rejects a login
// with PasswordResetRequiredException (see initiateLogin) rather than returning a
// real ChallengeName — this isn't part of Cognito's InitiateAuth/RespondToAuthChallenge
// vocabulary, it's a separate exception thrown when an admin has used
// AdminResetUserPassword (which puts the account in RESET_REQUIRED status).
export const PASSWORD_RESET_REQUIRED = 'PASSWORD_RESET_REQUIRED';

export interface AuthChallenge {
  challengeName: string;
  session: string;
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type LoginResult =
  | { type: 'challenge'; challenge: AuthChallenge }
  | { type: 'tokens'; tokens: AuthTokens }
  | { type: 'passwordResetRequired' };

function computeSecretHash(username: string, clientId: string, clientSecret: string): string {
  return crypto.createHmac('sha256', clientSecret).update(username + clientId).digest('base64');
}

function tokensFromAuthResult(auth: { IdToken?: string; AccessToken?: string; RefreshToken?: string; ExpiresIn?: number }): AuthTokens {
  return {
    idToken: auth.IdToken ?? '',
    accessToken: auth.AccessToken ?? '',
    refreshToken: auth.RefreshToken ?? '',
    expiresIn: auth.ExpiresIn ?? 0,
  };
}

/**
 * Maps Cognito auth errors to a generic client-facing message so callers can't tell
 * whether a username exists, a password was wrong, or a code was wrong/expired.
 */
function toApiError(err: unknown, clientMessage: string): ApiError {
  const name = err instanceof Error ? err.name : undefined;
  if (name === 'InvalidPasswordException') {
    return ApiError.badRequest('Password does not meet the required complexity');
  }
  if (
    name === 'NotAuthorizedException' ||
    name === 'UserNotFoundException' ||
    name === 'CodeMismatchException' ||
    name === 'ExpiredCodeException'
  ) {
    return ApiError.badRequest(clientMessage);
  }
  if (name === 'TooManyRequestsException' || name === 'LimitExceededException') {
    return ApiError.tooManyRequests('Too many attempts. Please try again later.');
  }
  const message = err instanceof Error ? err.message : 'cognito request failed';
  return ApiError.internal(message);
}

/**
 * Turns a Cognito auth response (from either InitiateAuth or
 * RespondToAuthChallenge) into a LoginResult, rejecting any challenge this flow
 * doesn't implement instead of silently handing the client a dead-end step.
 */
function toLoginResult(resp: InitiateAuthCommandOutput | RespondToAuthChallengeCommandOutput): LoginResult {
  if (resp.AuthenticationResult) {
    return { type: 'tokens', tokens: tokensFromAuthResult(resp.AuthenticationResult) };
  }

  if (!resp.ChallengeName || !resp.Session) {
    throw ApiError.internal('cognito did not return a challenge or tokens');
  }

  if (!SUPPORTED_CHALLENGES.has(resp.ChallengeName)) {
    throw ApiError.internal(
      `Unexpected Cognito challenge "${resp.ChallengeName}" — expected NEW_PASSWORD_REQUIRED or EMAIL_OTP. Verify Email OTP MFA is enabled and set as the preferred MFA method for this user.`,
    );
  }

  return { type: 'challenge', challenge: { challengeName: resp.ChallengeName, session: resp.Session } };
}

export class CognitoService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(clientId: string, clientSecret: string, client?: CognitoIdentityProviderClient) {
    this.client = client ?? new CognitoIdentityProviderClient({ region: process.env.AWS_REGION ?? 'us-west-2' });
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  static fromEnv(): CognitoService {
    const clientId = process.env.COGNITO_CLIENT_ID ?? '';
    const clientSecret = process.env.COGNITO_CLIENT_SECRET ?? '';
    return new CognitoService(clientId, clientSecret);
  }

  private secretHash(username: string): string {
    return computeSecretHash(username, this.clientId, this.clientSecret);
  }

  async initiateLogin(username: string, password: string): Promise<LoginResult> {
    try {
      const resp = await this.client.send(
        new InitiateAuthCommand({
          ClientId: this.clientId,
          AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
            SECRET_HASH: this.secretHash(username),
          },
        }),
      );

      return toLoginResult(resp);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof Error && err.name === 'PasswordResetRequiredException') {
        return { type: 'passwordResetRequired' };
      }
      throw toApiError(err, 'Invalid username or password');
    }
  }

  /**
   * Completes a Cognito-side forced password reset (an admin ran
   * AdminResetUserPassword, which emails the user a confirmation code and puts
   * their account in RESET_REQUIRED status). Unlike NEW_PASSWORD_REQUIRED, this
   * doesn't flow through InitiateAuth/RespondToAuthChallenge at all — it's the
   * separate ForgotPassword API — and it doesn't return tokens; the caller must
   * sign in again afterward with the new password.
   */
  async confirmForgotPassword(username: string, confirmationCode: string, newPassword: string): Promise<void> {
    try {
      await this.client.send(
        new ConfirmForgotPasswordCommand({
          ClientId: this.clientId,
          Username: username,
          ConfirmationCode: confirmationCode,
          Password: newPassword,
          SecretHash: this.secretHash(username),
        }),
      );
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw toApiError(err, 'Invalid or expired reset code');
    }
  }

  /**
   * Completes the NEW_PASSWORD_REQUIRED challenge — the first sign-in after an
   * admin user is created with a temporary password. Cognito typically follows
   * this with the EMAIL_OTP challenge (returned as another `challenge`, not
   * tokens), since this pool requires MFA on every sign-in.
   */
  async respondToNewPasswordRequired(username: string, session: string, newPassword: string): Promise<LoginResult> {
    try {
      const resp = await this.client.send(
        new RespondToAuthChallengeCommand({
          ClientId: this.clientId,
          ChallengeName: ChallengeNameType.NEW_PASSWORD_REQUIRED,
          Session: session,
          ChallengeResponses: {
            USERNAME: username,
            NEW_PASSWORD: newPassword,
            SECRET_HASH: this.secretHash(username),
          },
        }),
      );

      return toLoginResult(resp);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw toApiError(err, 'Could not set new password');
    }
  }

  async respondToEmailOtpChallenge(username: string, session: string, code: string): Promise<AuthTokens> {
    try {
      const resp = await this.client.send(
        new RespondToAuthChallengeCommand({
          ClientId: this.clientId,
          ChallengeName: ChallengeNameType.EMAIL_OTP,
          Session: session,
          ChallengeResponses: {
            USERNAME: username,
            EMAIL_OTP_CODE: code,
            SECRET_HASH: this.secretHash(username),
          },
        }),
      );

      if (!resp.AuthenticationResult) {
        throw ApiError.badRequest('Invalid or expired code');
      }

      return tokensFromAuthResult(resp.AuthenticationResult);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw toApiError(err, 'Invalid or expired code');
    }
  }

  /**
   * Exchanges a long-lived refresh token for a fresh id/access token, without
   * re-prompting for a password or OTP. Cognito does not return a new refresh
   * token here by default (no rotation), so callers should keep reusing the one
   * they already have until it expires on its own (pool-configured TTL).
   */
  async refresh(username: string, refreshToken: string): Promise<AuthTokens> {
    try {
      const resp = await this.client.send(
        new InitiateAuthCommand({
          ClientId: this.clientId,
          AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
            SECRET_HASH: this.secretHash(username),
          },
        }),
      );

      if (!resp.AuthenticationResult) {
        throw ApiError.unauthorized('Session expired, please sign in again');
      }

      return tokensFromAuthResult(resp.AuthenticationResult);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // A rejected/expired refresh token is an auth failure (401), not a client
      // input error — distinct from toApiError's 400 mapping used by login/verify.
      throw ApiError.unauthorized('Session expired, please sign in again');
    }
  }
}
