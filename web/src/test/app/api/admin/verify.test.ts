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

import { POST } from '@/app/api/admin/verify/route';
import { ApiRequestError } from '@/lib/api';

function makeRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/admin/verify', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('POST /api/admin/verify (BFF proxy)', () => {
    it('establishes the session from the returned tokens', async () => {
        const tokens = { idToken: 'id', accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600 };
        mockApiPostPublic.mockResolvedValue({ data: { tokens }, headers: new Headers() });

        const res = await POST(makeRequest({ username: 'admin', session: 'sess-123', code: '123456' }));

        expect(mockCompleteLogin).toHaveBeenCalledWith(tokens);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ ok: true });
    });

    it('returns 400 when the code is invalid, without touching the session', async () => {
        mockApiPostPublic.mockRejectedValue(new ApiRequestError(400, ['Invalid or expired code'], new Headers()));

        const res = await POST(makeRequest({ username: 'admin', session: 'sess-123', code: 'wrong' }));

        expect(mockCompleteLogin).not.toHaveBeenCalled();
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Invalid or expired code');
    });

    it('returns a generic 500 when the proxy call throws an unexpected error', async () => {
        mockApiPostPublic.mockRejectedValue(new Error('network error'));

        const res = await POST(makeRequest({ username: 'admin', session: 'sess-123', code: '123456' }));

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('Verification failed. Please try again.');
    });

    it('returns 500 when completeLogin itself throws (e.g. cookie store unavailable)', async () => {
        mockApiPostPublic.mockResolvedValue({
            data: { tokens: { idToken: 'id', accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600 } },
            headers: new Headers(),
        });
        mockCompleteLogin.mockRejectedValue(new Error('cookie store error'));

        const res = await POST(makeRequest({ username: 'admin', session: 'sess-123', code: '123456' }));

        expect(res.status).toBe(500);
    });
});
