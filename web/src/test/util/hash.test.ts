import { describe, it, expect } from 'vitest';
import { hashValue } from '@/util/hash';

describe('hashValue', () => {
    it('returns a 24-character hex string', () => {
        const result = hashValue('192.168.1.1');
        expect(result).toHaveLength(24);
        expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it('returns the same hash for the same input', () => {
        expect(hashValue('10.0.0.1')).toBe(hashValue('10.0.0.1'));
    });

    it('returns different hashes for different inputs', () => {
        expect(hashValue('10.0.0.1')).not.toBe(hashValue('10.0.0.2'));
    });

    it('handles empty string without throwing', () => {
        const result = hashValue('');
        expect(result).toHaveLength(24);
    });
});
