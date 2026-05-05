import { makeKey, hashIp } from '@/util/hash';
import { describe, it, expect } from 'vitest';

describe('makeKey', () => {
    it('should generate a hash key with default prefix', () => {
        const input = 'test string';
        const result = makeKey(input);
        
        expect(result).toMatch(/^K[a-f0-9]{24}$/);
        expect(result.startsWith('K')).toBe(true);
        expect(result.length).toBe(25); // 'K' + 24 hex characters
    });

    it('should generate a hash key with custom prefix', () => {
        const input = 'test string';
        const prefix = 'SONG';
        const result = makeKey(input, prefix);
        
        expect(result).toMatch(/^SONG[a-f0-9]{24}$/);
        expect(result.startsWith('SONG')).toBe(true);
        expect(result.length).toBe(28); // 'SONG' + 24 hex characters
    });

    it('should generate consistent hashes for the same input', () => {
        const input = 'consistent test';
        const result1 = makeKey(input);
        const result2 = makeKey(input);
        
        expect(result1).toBe(result2);
    });

    it('should generate different hashes for different inputs', () => {
        const input1 = 'first string';
        const input2 = 'second string';
        const result1 = makeKey(input1);
        const result2 = makeKey(input2);
        
        expect(result1).not.toBe(result2);
    });

    it('should handle empty string input', () => {
        const result = makeKey('');
        
        expect(result).toMatch(/^K[a-f0-9]{24}$/);
        expect(result.length).toBe(25);
    });

    it('should handle empty prefix', () => {
        const input = 'test';
        const result = makeKey(input, '');
        
        expect(result).toMatch(/^[a-f0-9]{24}$/);
        expect(result.startsWith('')).toBe(true);
        expect(result.length).toBe(24); // 24 hex characters
    });

    it('should handle special characters in input', () => {
        const input = 'test@#$%^&*()_+-=[]{}|;:,.<>?';
        const result = makeKey(input);
        
        expect(result).toMatch(/^K[a-f0-9]{24}$/);
        expect(result.length).toBe(25);
    });

    it('should handle unicode characters in input', () => {
        const input = 'test 🎵 unicode ñáéíóú';
        const result = makeKey(input);
        
        expect(result).toMatch(/^K[a-f0-9]{24}$/);
        expect(result.length).toBe(25);
    });

    it('should handle very long input strings', () => {
        const input = 'a'.repeat(10000);
        const result = makeKey(input);
        
        expect(result).toMatch(/^K[a-f0-9]{24}$/);
        expect(result.length).toBe(25);
    });

    it('should generate expected hash for known input', () => {
        // This test ensures the hash function is working as expected
        // SHA-1 of 'hello world' should consistently produce the same first 24 chars
        const input = 'hello world';
        const result = makeKey(input);
        
        // The SHA-1 of 'hello world' is '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed'
        // First 24 characters: '2aae6c35c94fcfb415dbe95f'
        expect(result).toBe('K2aae6c35c94fcfb415dbe95f');
    });

    it('should handle numeric strings', () => {
        const input = '12345';
        const result = makeKey(input);
        
        expect(result).toMatch(/^K[a-f0-9]{24}$/);
        expect(result.length).toBe(25);
    });

    it('should handle whitespace-only input', () => {
        const input = '   ';
        const result = makeKey(input);
        
        expect(result).toMatch(/^K[a-f0-9]{24}$/);
        expect(result.length).toBe(25);
    });

    it('should generate different results for inputs that differ only in case', () => {
        const input1 = 'Test String';
        const input2 = 'test string';
        const result1 = makeKey(input1);
        const result2 = makeKey(input2);
        
        expect(result1).not.toBe(result2);
    });

    it('should generate different results for inputs that differ only in whitespace', () => {
        const input1 = 'test string';
        const input2 = 'test  string';
        const result1 = makeKey(input1);
        const result2 = makeKey(input2);

        expect(result1).not.toBe(result2);
    });
});

describe('hashIp', () => {
    it('should return a 24-character hex string', () => {
        const result = hashIp('192.168.1.1');
        expect(result).toMatch(/^[a-f0-9]{24}$/);
        expect(result.length).toBe(24);
    });

    it('should produce consistent hashes for the same IP', () => {
        const ip = '10.0.0.1';
        expect(hashIp(ip)).toBe(hashIp(ip));
    });

    it('should produce different hashes for different IPs', () => {
        expect(hashIp('192.168.1.1')).not.toBe(hashIp('192.168.1.2'));
    });

    it('should handle IPv6 addresses', () => {
        const result = hashIp('2001:db8::1');
        expect(result).toMatch(/^[a-f0-9]{24}$/);
    });

    it('should not include the raw IP in the output', () => {
        const ip = '1.2.3.4';
        expect(hashIp(ip)).not.toContain(ip);
    });

    it('should produce a hash with no prefix (unlike makeKey)', () => {
        const result = hashIp('192.168.1.1');
        // makeKey adds a "K" prefix; hashIp must not
        expect(result.startsWith('K')).toBe(false);
    });
});