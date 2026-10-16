import { describe, it, expect } from 'vitest';
import { titleFontSize, truncateText } from '@/og/ogText';

describe('truncateText', () => {
    it('returns short text unchanged', () => {
        expect(truncateText('Wild One', 20)).toBe('Wild One');
    });

    it('cuts long text to the limit, ending with an ellipsis', () => {
        const result = truncateText('abcdefghijklmnopqrstuvwxyz', 10);

        expect(result).toHaveLength(10);
        expect(result.endsWith('…')).toBe(true);
    });

    it('collapses whitespace and trims', () => {
        expect(truncateText('  hello \n  world  ', 50)).toBe('hello world');
    });

    it('handles null, undefined and empty input', () => {
        expect(truncateText(undefined, 10)).toBe('');
        expect(truncateText(null, 10)).toBe('');
        expect(truncateText('', 10)).toBe('');
    });

    it('does not leave a space before the ellipsis', () => {
        expect(truncateText('hello world again', 7)).toBe('hello…');
    });
});

describe('truncateText with multi-code-unit characters', () => {
    it('never splits an emoji surrogate pair', () => {
        const result = truncateText('😀😀😀😀😀😀', 4);

        expect(result).toBe('😀😀😀…');
        expect(Array.from(result)).toHaveLength(4);
    });

    it('counts accented and non-Latin characters as one each', () => {
        expect(truncateText('Beyoncé', 7)).toBe('Beyoncé');
        expect(truncateText('日本語のタイトル', 4)).toBe('日本語…');
    });

    it('returns only an ellipsis when the limit is 1 or less', () => {
        expect(truncateText('abc', 1)).toBe('…');
        expect(truncateText('abc', 0)).toBe('…');
    });
});

describe('titleFontSize', () => {
    it('shrinks as titles get longer', () => {
        expect(titleFontSize('a'.repeat(10))).toBeGreaterThan(titleFontSize('a'.repeat(30)));
        expect(titleFontSize('a'.repeat(30))).toBeGreaterThan(titleFontSize('a'.repeat(60)));
    });
});
