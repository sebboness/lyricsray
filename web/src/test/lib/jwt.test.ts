import { describe, it, expect } from 'vitest';
import { decodeIdToken, isValidSessionToken } from '@/lib/jwt';

function makeToken(claims: object): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return `${header}.${payload}.fake-signature`;
}

describe('decodeIdToken', () => {
    it('decodes the payload of a well-formed token', () => {
        const token = makeToken({ sub: 'user-1', email: 'admin@example.com' });

        expect(decodeIdToken(token)).toMatchObject({ sub: 'user-1', email: 'admin@example.com' });
    });

    it('returns null for a malformed token', () => {
        expect(decodeIdToken('not-a-jwt')).toBeNull();
    });

    it('returns null for an empty string', () => {
        expect(decodeIdToken('')).toBeNull();
    });
});

describe('isValidSessionToken', () => {
    it('returns false for undefined/null tokens', () => {
        expect(isValidSessionToken(undefined)).toBe(false);
        expect(isValidSessionToken(null)).toBe(false);
    });

    it('returns false for a token missing sub', () => {
        const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 });

        expect(isValidSessionToken(token)).toBe(false);
    });

    it('returns false for an expired token', () => {
        const token = makeToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 3600 });

        expect(isValidSessionToken(token)).toBe(false);
    });

    it('returns true for a valid, unexpired token', () => {
        const token = makeToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 });

        expect(isValidSessionToken(token)).toBe(true);
    });
});
