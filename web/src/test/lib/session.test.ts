import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet, mockSet, mockDelete } = vi.hoisted(() => ({
    mockGet: vi.fn(),
    mockSet: vi.fn(),
    mockDelete: vi.fn(),
}));

vi.mock('next/headers', () => ({
    cookies: vi.fn(async () => ({
        get: mockGet,
        set: mockSet,
        delete: mockDelete,
    })),
}));

import { SESSION_COOKIE, setSession, setRefreshCookie, clearSession, getIdToken, getSession } from '@/lib/session';
import { REFRESH_COOKIE } from '@/lib/jwt';

function makeToken(claims: object): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return `${header}.${payload}.fake-signature`;
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('setSession', () => {
    it('sets an httpOnly cookie with the id token', async () => {
        await setSession('some-id-token', 3600);

        expect(mockSet).toHaveBeenCalledWith(SESSION_COOKIE, 'some-id-token', expect.objectContaining({
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 3600,
        }));
    });
});

describe('setRefreshCookie', () => {
    it('sets an httpOnly cookie with the username and refresh token', async () => {
        await setRefreshCookie('admin', 'some-refresh-token');

        expect(mockSet).toHaveBeenCalledWith(
            REFRESH_COOKIE,
            JSON.stringify({ username: 'admin', refreshToken: 'some-refresh-token' }),
            expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
        );
    });
});

describe('clearSession', () => {
    it('deletes both the session and refresh cookies', async () => {
        await clearSession();

        expect(mockDelete).toHaveBeenCalledWith(SESSION_COOKIE);
        expect(mockDelete).toHaveBeenCalledWith(REFRESH_COOKIE);
    });
});

describe('getIdToken', () => {
    it('returns null when no cookie is set', async () => {
        mockGet.mockReturnValue(undefined);

        expect(await getIdToken()).toBeNull();
    });

    it('returns null when the token is expired', async () => {
        const token = makeToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 3600 });
        mockGet.mockReturnValue({ value: token });

        expect(await getIdToken()).toBeNull();
    });

    it('returns the token when valid', async () => {
        const token = makeToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 });
        mockGet.mockReturnValue({ value: token });

        expect(await getIdToken()).toBe(token);
    });
});

describe('getSession', () => {
    it('returns null when there is no valid token', async () => {
        mockGet.mockReturnValue(undefined);

        expect(await getSession()).toBeNull();
    });

    it('returns the decoded session fields for a valid token', async () => {
        const token = makeToken({
            sub: 'user-1',
            email: 'admin@example.com',
            name: 'Admin Person',
            'cognito:username': 'admin',
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        mockGet.mockReturnValue({ value: token });

        expect(await getSession()).toEqual({
            userId: 'user-1',
            email: 'admin@example.com',
            fullName: 'Admin Person',
            username: 'admin',
        });
    });
});
