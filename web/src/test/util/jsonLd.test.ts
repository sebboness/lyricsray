import { describe, it, expect } from 'vitest';
import { buildAnalysisJsonLd, buildArtistJsonLd, serializeJsonLd } from '@/util/jsonLd';
import type { AnalysisResult } from '@/storage/AnalysisResultStorage';

const baseUrl = 'https://lyricsray.example';
const pageUrl = `${baseUrl}/analysis/Guster/Terrified/abc123`;

const makeResult = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => ({
    songKey: 'Guster/Terrified/abc123',
    date: '2026-09-12T10:00:00.000Z',
    song: { songName: 'Terrified', artistName: 'Guster' },
    recommendedAge: 13,
    themes: [],
    analysis: 'Long analysis',
    appropriate: 2,
    entityType: 'ANALYSIS',
    summary: 'Mild themes',
    ...overrides,
});

describe('buildAnalysisJsonLd', () => {
    it('describes the analysis and carries ownership, license and credit text', () => {
        const data = buildAnalysisJsonLd({ result: makeResult(), pageUrl, baseUrl });

        expect(data).toMatchObject({
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            name: 'LyricsRay analysis of "Terrified" by Guster',
            description: 'Mild themes',
            url: pageUrl,
            datePublished: '2026-09-12T10:00:00.000Z',
            copyrightYear: 2026,
            license: `${baseUrl}/privacy-and-terms`,
            creditText: `Analysis by LyricsRay (${pageUrl})`,
            copyrightHolder: { '@type': 'Organization', name: 'LyricsRay', url: baseUrl },
            about: { '@type': 'MusicRecording', name: 'Terrified', byArtist: { '@type': 'MusicGroup', name: 'Guster' } },
        });
    });

    it('includes the full analysis as text and the themes as readable keywords', () => {
        const data = buildAnalysisJsonLd({
            result: makeResult({ analysis: '  Paragraph one.\n\nParagraph two.  ', themes: ['sexual_innuendo', 'party_culture'] }),
            pageUrl,
            baseUrl,
        });

        expect(data.text).toBe('Paragraph one.\n\nParagraph two.');
        expect(data.keywords).toEqual(['sexual innuendo', 'party culture']);
        expect(data.description).toBe('Mild themes');
    });

    it('omits text and keywords when the analysis is blank and there are no themes', () => {
        const blank = JSON.parse(serializeJsonLd(buildAnalysisJsonLd({ result: makeResult({ analysis: '   ', themes: [] }), pageUrl, baseUrl })));
        expect(blank).not.toHaveProperty('text');
        expect(blank).not.toHaveProperty('keywords');

        const missing = JSON.parse(
            serializeJsonLd(buildAnalysisJsonLd({ result: makeResult({ analysis: undefined as never, themes: undefined as never }), pageUrl, baseUrl })),
        );
        expect(missing).not.toHaveProperty('text');
        expect(missing).not.toHaveProperty('keywords');
    });

    it('drops empty theme entries and keeps markup in the analysis safely serializable', () => {
        const data = buildAnalysisJsonLd({
            result: makeResult({ analysis: 'Uses </script> in lyrics', themes: ['romance', '', '  '] }),
            pageUrl,
            baseUrl,
        });

        expect(data.keywords).toEqual(['romance']);
        const json = serializeJsonLd(data);
        expect(json).not.toContain('</script>');
        expect(JSON.parse(json).text).toBe('Uses </script> in lyrics');
    });

    it('falls back to a generated description when there is no summary', () => {
        const data = buildAnalysisJsonLd({ result: makeResult({ summary: undefined }), pageUrl, baseUrl });

        expect(data.description).toBe('Age-appropriateness analysis of "Terrified" by Guster.');
    });

    it('omits the artist, date and year when they are missing or invalid', () => {
        const noArtist = buildAnalysisJsonLd({ result: makeResult({ song: { songName: 'Terrified' }, date: 'not a date' }), pageUrl, baseUrl });

        expect(noArtist.name).toBe('LyricsRay analysis of "Terrified"');
        expect(noArtist.about.byArtist).toBeUndefined();
        expect(noArtist.datePublished).toBeUndefined();
        expect(noArtist.copyrightYear).toBeUndefined();
        expect(JSON.parse(serializeJsonLd(noArtist))).not.toHaveProperty('datePublished');
    });

    it('uses a placeholder when the song details are missing entirely', () => {
        const data = buildAnalysisJsonLd({ result: makeResult({ song: undefined as never, date: '' }), pageUrl, baseUrl });

        expect(data.name).toBe('LyricsRay analysis of "Unknown song"');
        expect(data.about.name).toBe('Unknown song');
    });

    it('leaves the organization url out when no base URL is configured', () => {
        const data = buildAnalysisJsonLd({ result: makeResult(), pageUrl: '/x', baseUrl: '' });

        expect(JSON.parse(serializeJsonLd(data)).copyrightHolder).toEqual({ '@type': 'Organization', name: 'LyricsRay' });
    });
});

describe('buildArtistJsonLd', () => {
    it('describes the artist page with the same rights fields', () => {
        const data = buildArtistJsonLd({ artistName: 'Guster', songCount: 3, pageUrl: `${baseUrl}/analysis/Guster`, baseUrl });

        expect(data).toMatchObject({
            '@type': 'CollectionPage',
            name: 'Guster song analysis',
            description: "LyricsRay's age-appropriateness analysis for 3 songs by Guster.",
            about: { '@type': 'MusicGroup', name: 'Guster' },
            license: `${baseUrl}/privacy-and-terms`,
            creditText: `Analysis by LyricsRay (${baseUrl}/analysis/Guster)`,
        });
    });

    it('uses the singular for a single song', () => {
        const data = buildArtistJsonLd({ artistName: 'Guster', songCount: 1, pageUrl, baseUrl });

        expect(data.description).toContain('1 song by Guster');
    });
});

describe('serializeJsonLd', () => {
    it('escapes < so data can never close the script tag', () => {
        const json = serializeJsonLd({ name: '</script><script>alert(1)</script>' });

        expect(json).not.toContain('<');
        expect(JSON.parse(json).name).toBe('</script><script>alert(1)</script>');
    });

    it('drops undefined fields', () => {
        expect(serializeJsonLd({ a: 1, b: undefined })).toBe('{"a":1}');
    });
});
