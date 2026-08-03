import { cookies } from 'next/headers';
import {
    SESSION_COOKIE,
    REFRESH_COOKIE,
    REFRESH_TOKEN_MAX_AGE_SECONDS,
    RefreshCookiePayload,
    decodeIdToken,
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
        fullName: claims.name ?? '',
        username: claims['cognito:username'] ?? '',
    };
}
