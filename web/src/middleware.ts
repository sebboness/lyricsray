import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, REFRESH_COOKIE, RefreshCookiePayload, isValidSessionToken } from '@/lib/jwt';

// Node runtime (not edge) so this behaves identically to the rest of the server-side
// code — same process.env access, same fetch semantics — when it calls the Lambda
// API directly below.
export const runtime = 'nodejs';

const API_URL = (process.env.API_URL ?? '').replace(/\/$/, '');

interface RefreshTokensResponse {
    tokens: { idToken: string; expiresIn: number };
}

/**
 * Silently exchanges the long-lived refresh cookie for a fresh id token, so a
 * returning admin who still has a valid refresh token doesn't have to sign in
 * again just because the (short-lived) id token cookie expired.
 */
async function tryRefresh(request: NextRequest): Promise<NextResponse | null> {
    const raw = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!raw) return null;

    let payload: RefreshCookiePayload;
    try {
        payload = JSON.parse(raw);
        if (!payload.username || !payload.refreshToken) return null;
    } catch {
        return null;
    }

    try {
        const res = await fetch(`${API_URL}/v1/admin/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: payload.username, refreshToken: payload.refreshToken }),
        });
        if (!res.ok) return null;

        const json: { data: RefreshTokensResponse } = await res.json();
        const { idToken, expiresIn } = json.data.tokens;
        if (!idToken) return null;

        const response = NextResponse.next();
        response.cookies.set(SESSION_COOKIE, idToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: expiresIn,
        });
        return response;
    } catch {
        return null;
    }
}

export async function middleware(request: NextRequest) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (isValidSessionToken(token)) {
        return NextResponse.next();
    }

    const refreshed = await tryRefresh(request);
    if (refreshed) return refreshed;

    return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
    matcher: ['/admin/:path*'],
};
