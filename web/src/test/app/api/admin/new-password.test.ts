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

import { POST } from '@/app/api/admin/new-password/route';
import { ApiRequestError } from '@/lib/api';

function makeRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/admin/new-password', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('POST /api/admin/new-password (BFF proxy)', () => {
    it('passes through a follow-up EMAIL_OTP challenge', async () => {
        mockApiPostPublic.mockResolvedValue({
            data: { challengeName: 'EMAIL_OTP', session: 'sess-456', tokens: null },
            headers: new Headers(),
        });

        const res = await POST(makeRequest({ username: 'admin', session: 'sess-123', newPassword: 'NewStrongPass1!' }));

        expect(mockCompleteLogin).not.toHaveBeenCalled();
        const body = await res.json();
        expect(body).toEqual({ done: false, challengeName: 'EMAIL_OTP', session: 'sess-456' });
    });

    it('establishes the session when no further challenge follows', async () => {
        mockApiPostPublic.mockResolvedValue({
            data: { challengeName: null, session: null, tokens: { idToken: 'id', accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600 } },
            headers: new Headers(),
        });

        const res = await POST(makeRequest({ username: 'admin', session: 'sess-123', newPassword: 'NewStrongPass1!' }));

        expect(mockCompleteLogin).toHaveBeenCalledWith({ idToken: 'id', accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600 });
        const body = await res.json();
        expect(body).toEqual({ done: true });
    });

    it('returns 400 when Cognito rejects the new password', async () => {
        mockApiPostPublic.mockRejectedValue(new ApiRequestError(400, ['Password does not meet the required complexity'], new Headers()));

        const res = await POST(makeRequest({ username: 'admin', session: 'sess-123', newPassword: 'weak' }));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Password does not meet the required complexity');
    });

    it('returns a generic 500 when the proxy call throws an unexpected error', async () => {
        mockApiPostPublic.mockRejectedValue(new Error('network error'));

        const res = await POST(makeRequest({ username: 'admin', session: 'sess-123', newPassword: 'NewStrongPass1!' }));

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('Could not set new password. Please try again.');
    });
});
