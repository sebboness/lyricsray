import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCompleteLogin } = vi.hoisted(() => ({
    mockCompleteLogin: vi.fn(),
}));

vi.mock('@/lib/session', () => ({
    completeLogin: mockCompleteLogin,
}));

import { finalizeLoginResult } from '@/lib/adminAuthResponse';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('finalizeLoginResult', () => {
    it('establishes the session and reports done when tokens are present', async () => {
        const tokens = { idToken: 'id', accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600 };

        const result = await finalizeLoginResult({ challengeName: null, session: null, tokens });

        expect(mockCompleteLogin).toHaveBeenCalledWith(tokens);
        expect(result).toEqual({ done: true });
    });

    it('passes through the challenge without touching the session when tokens are absent', async () => {
        const result = await finalizeLoginResult({ challengeName: 'EMAIL_OTP', session: 'sess-123', tokens: null });

        expect(mockCompleteLogin).not.toHaveBeenCalled();
        expect(result).toEqual({ done: false, challengeName: 'EMAIL_OTP', session: 'sess-123' });
    });
});
