import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockApiPostPublic, mockCompleteLogin } = vi.hoisted(() => ({
    mockApiPostPublic: vi.fn(),
    mockCompleteLogin: vi.fn(),
}));

vi.mock('@/logger/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, apiPostPublic: mockApiPostPublic };
});

vi.mock('@/lib/session', () => ({
    completeLogin: mockCompleteLogin,
}));

import { POST } from '@/app/api/admin/login/route';
import { ApiRequestError } from '@/lib/api';

function makeRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('POST /api/admin/login (BFF proxy)', () => {
    it('establishes the session and reports done when Cognito returns tokens directly', async () => {
        mockApiPostPublic.mockResolvedValue({
            data: { challengeName: null, session: null, tokens: { idToken: 'id', accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600 } },
            headers: new Headers(),
        });

        const res = await POST(makeRequest({ username: 'admin', password: 'correct' }));

        expect(mockCompleteLogin).toHaveBeenCalledWith({ idToken: 'id', accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600 });
        const body = await res.json();
        expect(body).toEqual({ done: true });
    });

    it('passes through a follow-up challenge without touching the session', async () => {
        mockApiPostPublic.mockResolvedValue({
            data: { challengeName: 'EMAIL_OTP', session: 'sess-123', tokens: null },
            headers: new Headers(),
        });

        const res = await POST(makeRequest({ username: 'admin', password: 'correct' }));

        expect(mockCompleteLogin).not.toHaveBeenCalled();
        const body = await res.json();
        expect(body).toEqual({ done: false, challengeName: 'EMAIL_OTP', session: 'sess-123' });
    });

    it('passes through PASSWORD_RESET_REQUIRED with no session field', async () => {
        mockApiPostPublic.mockResolvedValue({
            data: { challengeName: 'PASSWORD_RESET_REQUIRED', session: null, tokens: null },
            headers: new Headers(),
        });

        const res = await POST(makeRequest({ username: 'admin', password: 'correct' }));

        const body = await res.json();
        expect(body).toEqual({ done: false, challengeName: 'PASSWORD_RESET_REQUIRED', session: undefined });
    });

    it('forwards the Lambda API status code and error message on invalid credentials', async () => {
        mockApiPostPublic.mockRejectedValue(new ApiRequestError(400, ['Invalid username or password'], new Headers()));

        const res = await POST(makeRequest({ username: 'admin', password: 'wrong' }));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Invalid username or password');
    });

    it('returns a generic 500 when the proxy call throws an unexpected error', async () => {
        mockApiPostPublic.mockRejectedValue(new Error('network error'));

        const res = await POST(makeRequest({ username: 'admin', password: 'correct' }));

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('Login failed. Please try again.');
    });
});
