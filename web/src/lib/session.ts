import { cookies } from 'next/headers';
import {
    SESSION_COOKIE,
    REFRESH_COOKIE,
    REFRESH_TOKEN_MAX_AGE_SECONDS,
    RefreshCookiePayload,
    decodeIdToken,
    fullNameFromClaims,
    isValidSessionToken,
} from './jwt';

export { SESSION_COOKIE, isValidSessionToken };

export interface Session {
    userId: string;
    email: string;
    fullName: string;
    username: string;
}

export async function setSession(idToken: string, expiresInSeconds: number): Promise<void> {
    (await cookies()).set(SESSION_COOKIE, idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: expiresInSeconds,
    });
}

export async function setRefreshCookie(username: string, refreshToken: string): Promise<void> {
    const payload: RefreshCookiePayload = { username, refreshToken };
    (await cookies()).set(REFRESH_COOKIE, JSON.stringify(payload), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
}

export interface LoginTokens {
    idToken: string;
    refreshToken: string;
    expiresIn: number;
}

/**
 * Establishes the admin session from a completed Cognito auth result (tokens),
 * regardless of which step produced them — login, new-password, or verify can
 * each end this way depending on whether Cognito still has a follow-up challenge
 * (e.g. EMAIL_OTP) to run. Uses the canonical username from the token's own claims
 * (not whatever the caller typed) so the refresh flow's SECRET_HASH always matches
 * what Cognito expects.
 */
export async function completeLogin(tokens: LoginTokens): Promise<void> {
    await setSession(tokens.idToken, tokens.expiresIn);

    const claims = decodeIdToken(tokens.idToken);
    if (claims?.['cognito:username'] && tokens.refreshToken) {
        await setRefreshCookie(claims['cognito:username'], tokens.refreshToken);
    }
}

export async function clearSession(): Promise<void> {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    store.delete(REFRESH_COOKIE);
}

export async function getIdToken(): Promise<string | null> {
    const idToken = (await cookies()).get(SESSION_COOKIE)?.value;
    return isValidSessionToken(idToken) ? idToken! : null;
}

export async function getSession(): Promise<Session | null> {
    const idToken = await getIdToken();
    if (!idToken) return null;

    const claims = decodeIdToken(idToken);
    if (!claims?.sub) return null;

    return {
        userId: claims.sub,
        email: claims.email ?? '',
        fullName: fullNameFromClaims(claims),
        username: claims['cognito:username'] ?? '',
    };
}
