import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SESSION_COOKIE, REFRESH_COOKIE } from '@/lib/jwt';
import { middleware } from '@/middleware';

function makeToken(claims: object): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return `${header}.${payload}.fake-signature`;
}

function makeRequest(cookies: Record<string, string> = {}): NextRequest {
    const request = new NextRequest('http://localhost/admin');
    for (const [name, value] of Object.entries(cookies)) {
        request.cookies.set(name, value);
    }
    return request;
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('middleware', () => {
    it('passes through when the session cookie holds a valid token', async () => {
        const token = makeToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 });

        const res = await middleware(makeRequest({ [SESSION_COOKIE]: token }));

        expect(res.headers.get('location')).toBeNull();
    });

    it('redirects to /login when there is no session or refresh cookie', async () => {
        const res = await middleware(makeRequest());

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('/login');
    });

    it('redirects to /login when the refresh cookie is malformed', async () => {
        const res = await middleware(makeRequest({ [REFRESH_COOKIE]: 'not-json' }));

        expect(res.headers.get('location')).toContain('/login');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('silently refreshes and sets a new session cookie when the refresh call succeeds', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: { tokens: { idToken: 'new-id-token', expiresIn: 3600 } } }),
        });
        const refreshCookie = JSON.stringify({ username: 'admin', refreshToken: 'valid-refresh' });

        const res = await middleware(makeRequest({ [REFRESH_COOKIE]: refreshCookie }));

        expect(res.headers.get('location')).toBeNull();
        expect(res.cookies.get(SESSION_COOKIE)?.value).toBe('new-id-token');
    });

    it('redirects to /login when the refresh call fails', async () => {
        (global.fetch as any).mockResolvedValue({ ok: false });
        const refreshCookie = JSON.stringify({ username: 'admin', refreshToken: 'stale-token' });

        const res = await middleware(makeRequest({ [REFRESH_COOKIE]: refreshCookie }));

        expect(res.headers.get('location')).toContain('/login');
    });
});
