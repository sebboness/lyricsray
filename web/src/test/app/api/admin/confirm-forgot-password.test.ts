import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockApiPostPublic } = vi.hoisted(() => ({
    mockApiPostPublic: vi.fn(),
}));

vi.mock('@/logger/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, apiPostPublic: mockApiPostPublic };
});

import { POST } from '@/app/api/admin/confirm-forgot-password/route';
import { ApiRequestError } from '@/lib/api';

function makeRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/admin/confirm-forgot-password', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('POST /api/admin/confirm-forgot-password (BFF proxy)', () => {
    it('proxies the request and reports ok on success', async () => {
        mockApiPostPublic.mockResolvedValue({ data: {}, headers: new Headers() });

        const res = await POST(makeRequest({ username: 'admin', confirmationCode: '1234567', newPassword: 'NewStrongPass1!' }));

        expect(mockApiPostPublic).toHaveBeenCalledWith('/v1/admin/auth/confirm-forgot-password', {
            username: 'admin', confirmationCode: '1234567', newPassword: 'NewStrongPass1!',
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ ok: true });
    });

    it('returns 400 when the reset code is invalid or expired', async () => {
        mockApiPostPublic.mockRejectedValue(new ApiRequestError(400, ['Invalid or expired reset code'], new Headers()));

        const res = await POST(makeRequest({ username: 'admin', confirmationCode: 'wrong', newPassword: 'NewStrongPass1!' }));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Invalid or expired reset code');
    });

    it('returns a generic 500 when the proxy call throws an unexpected error', async () => {
        mockApiPostPublic.mockRejectedValue(new Error('network error'));

        const res = await POST(makeRequest({ username: 'admin', confirmationCode: '1234567', newPassword: 'NewStrongPass1!' }));

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('Could not reset password. Please try again.');
    });
});
