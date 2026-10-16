import { describe, it, expect } from 'vitest';
import { buildLlmsTxt } from '@/util/llmsTxt';

describe('buildLlmsTxt', () => {
    const text = buildLlmsTxt('https://lyricsray.example');

    it('follows the llms.txt shape: H1 title, blockquote summary, then sections', () => {
        const lines = text.split('\n');

        expect(lines[0]).toBe('# LyricsRay');
        expect(lines[2].startsWith('> ')).toBe(true);
        expect(text).toContain('## Using this content');
        expect(text).toContain('## Pages');
    });

    it('requires attribution and links to the terms and key pages with absolute URLs', () => {
        expect(text).toContain('credit LyricsRay');
        expect(text).toContain('https://lyricsray.example/privacy-and-terms');
        expect(text).toContain('(https://lyricsray.example/about)');
    });

    it('states that lyrics belong to their rightsholders', () => {
        expect(text).toContain('Song lyrics belong to their rightsholders');
    });

    it('contains no em dashes and ends with a newline', () => {
        expect(text).not.toContain('—');
        expect(text.endsWith('\n')).toBe(true);
    });
});
