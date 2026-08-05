import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockClearSession } = vi.hoisted(() => ({
    mockClearSession: vi.fn(),
}));

vi.mock('@/lib/session', () => ({
    clearSession: mockClearSession,
}));

import { POST } from '@/app/api/admin/logout/route';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('POST /api/admin/logout', () => {
    it('clears the session and reports ok', async () => {
        const res = await POST();

        expect(mockClearSession).toHaveBeenCalledTimes(1);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ ok: true });
    });
});
