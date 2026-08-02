import { makeKey, hashIp } from './hash';
import { describe, it, expect } from 'vitest';

describe('makeKey', () => {
    it('should generate a hash key with default prefix', () => {
        const result = makeKey('test string');
        expect(result).toMatch(/^K[a-f0-9]{24}$/);
        expect(result.length).toBe(25);
    });

    it('should generate a hash key with custom prefix', () => {
        const result = makeKey('test string', 'SONG');
        expect(result).toMatch(/^SONG[a-f0-9]{24}$/);
        expect(result.length).toBe(28);
    });

    it('should generate consistent hashes for the same input', () => {
        expect(makeKey('consistent test')).toBe(makeKey('consistent test'));
    });

    it('should generate different hashes for different inputs', () => {
        expect(makeKey('first string')).not.toBe(makeKey('second string'));
    });

    it('should generate expected hash for known input', () => {
        // SHA-1 of 'hello world' is '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed'
        expect(makeKey('hello world')).toBe('K2aae6c35c94fcfb415dbe95f');
    });

    it('should handle empty prefix', () => {
        const result = makeKey('test', '');
        expect(result).toMatch(/^[a-f0-9]{24}$/);
        expect(result.length).toBe(24);
    });

    it('should handle unicode characters in input', () => {
        const result = makeKey('test 🎵 unicode ñáéíóú');
        expect(result).toMatch(/^K[a-f0-9]{24}$/);
    });

    it('should generate different results for inputs that differ only in whitespace', () => {
        expect(makeKey('test string')).not.toBe(makeKey('test  string'));
    });
});

describe('hashIp', () => {
    it('should return a 24-character hex string', () => {
        const result = hashIp('192.168.1.1');
        expect(result).toMatch(/^[a-f0-9]{24}$/);
    });

    it('should produce consistent hashes for the same IP', () => {
        expect(hashIp('10.0.0.1')).toBe(hashIp('10.0.0.1'));
    });

    it('should produce different hashes for different IPs', () => {
        expect(hashIp('192.168.1.1')).not.toBe(hashIp('192.168.1.2'));
    });

    it('should handle IPv6 addresses', () => {
        expect(hashIp('2001:db8::1')).toMatch(/^[a-f0-9]{24}$/);
    });

    it('should not include the raw IP in the output', () => {
        expect(hashIp('1.2.3.4')).not.toContain('1.2.3.4');
    });

    it('should produce a hash with no prefix (unlike makeKey)', () => {
        expect(hashIp('192.168.1.1').startsWith('K')).toBe(false);
    });
});
