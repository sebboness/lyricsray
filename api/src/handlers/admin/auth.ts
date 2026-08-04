import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoService, LoginResult, PASSWORD_RESET_REQUIRED } from '../../services/cognito';
import { ApiError } from '../../util/errors';
import { ok, fromError } from '../../util/response';
import { logger } from '../../util/logger';

interface LoginRequest {
  username: string;
  password: string;
}

interface NewPasswordRequest {
  username: string;
  session: string;
  newPassword: string;
}

interface ConfirmForgotPasswordRequest {
  username: string;
  confirmationCode: string;
  newPassword: string;
}

interface VerifyRequest {
  username: string;
  session: string;
  code: string;
}

interface RefreshRequest {
  username: string;
  refreshToken: string;
}

// login and new-password can each end in another challenge (e.g. EMAIL_OTP),
// completed tokens, or (login only) a forced password reset — shared so both
// handlers return the same response shape.
function loginResultResponse(result: LoginResult, origin?: string): APIGatewayProxyResult {
  if (result.type === 'tokens') {
    return ok({ challengeName: null, session: null, tokens: result.tokens }, origin);
  }
  if (result.type === 'passwordResetRequired') {
    return ok({ challengeName: PASSWORD_RESET_REQUIRED, session: null, tokens: null }, origin);
  }
  return ok({ challengeName: result.challenge.challengeName, session: result.challenge.session, tokens: null }, origin);
}

export async function loginHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const body: LoginRequest = JSON.parse(event.body || '{}');
    const { username, password } = body;

    if (!username?.trim() || !password) {
      throw ApiError.badRequest('Username and password are required');
    }

    const result = await CognitoService.fromEnv().initiateLogin(username.trim(), password);

    return loginResultResponse(result, origin);
  } catch (err) {
    logger.error('error in admin login handler', { err });
    return fromError(err, origin);
  }
}

export async function newPasswordHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const body: NewPasswordRequest = JSON.parse(event.body || '{}');
    const { username, session, newPassword } = body;

    if (!username?.trim() || !session || !newPassword) {
      throw ApiError.badRequest('Username, session, and newPassword are required');
    }

    const result = await CognitoService.fromEnv().respondToNewPasswordRequired(username.trim(), session, newPassword);

    return loginResultResponse(result, origin);
  } catch (err) {
    logger.error('error in admin new-password handler', { err });
    return fromError(err, origin);
  }
}

export async function confirmForgotPasswordHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const body: ConfirmForgotPasswordRequest = JSON.parse(event.body || '{}');
    const { username, confirmationCode, newPassword } = body;

    if (!username?.trim() || !confirmationCode?.trim() || !newPassword) {
      throw ApiError.badRequest('Username, confirmationCode, and newPassword are required');
    }

    await CognitoService.fromEnv().confirmForgotPassword(username.trim(), confirmationCode.trim(), newPassword);

    // ConfirmForgotPassword never returns tokens — the caller must sign in again
    // with the new password (which then proceeds through the normal EMAIL_OTP step).
    return ok({}, origin);
  } catch (err) {
    logger.error('error in admin confirm-forgot-password handler', { err });
    return fromError(err, origin);
  }
}

export async function verifyHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const body: VerifyRequest = JSON.parse(event.body || '{}');
    const { username, session, code } = body;

    if (!username?.trim() || !session || !code?.trim()) {
      throw ApiError.badRequest('Username, session, and code are required');
    }

    const tokens = await CognitoService.fromEnv().respondToEmailOtpChallenge(username.trim(), session, code.trim());

    return ok({ tokens }, origin);
  } catch (err) {
    logger.error('error in admin verify handler', { err });
    return fromError(err, origin);
  }
}

export async function refreshHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const origin = event.headers?.Origin ?? event.headers?.origin;
  try {
    const body: RefreshRequest = JSON.parse(event.body || '{}');
    const { username, refreshToken } = body;

    if (!username?.trim() || !refreshToken) {
      throw ApiError.badRequest('Username and refreshToken are required');
    }

    const tokens = await CognitoService.fromEnv().refresh(username.trim(), refreshToken);

    return ok({ tokens }, origin);
  } catch (err) {
    logger.error('error in admin refresh handler', { err });
    return fromError(err, origin);
  }
}
