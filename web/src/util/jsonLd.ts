import type { AnalysisResult } from '@/storage/AnalysisResultStorage';

const ORG_NAME = 'LyricsRay';

interface RightsArgs {
    baseUrl: string;
    pageUrl: string;
    year?: number;
}

const organization = (baseUrl: string) => ({ '@type': 'Organization', name: ORG_NAME, url: baseUrl || undefined });

/** Rights fields shared by every page: who owns the content, under what terms, and how to credit it. */
function buildRights({ baseUrl, pageUrl, year }: RightsArgs) {
    return {
        publisher: organization(baseUrl),
        copyrightHolder: organization(baseUrl),
        copyrightYear: year,
        copyrightNotice: `Analyses are the work of ${ORG_NAME}. Share with attribution to ${ORG_NAME} and a link to the original page.`,
        license: `${baseUrl}/privacy-and-terms`,
        creditText: `Analysis by ${ORG_NAME} (${pageUrl})`,
    };
}

function parseDate(date: string | undefined): { iso?: string; year?: number } {
    if (!date) return {};
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return {};
    return { iso: parsed.toISOString(), year: parsed.getUTCFullYear() };
}

interface AnalysisJsonLdArgs {
    result: AnalysisResult;
    pageUrl: string;
    baseUrl: string;
}

/** schema.org description of a single song analysis, including its ownership and credit terms. */
export function buildAnalysisJsonLd({ result, pageUrl, baseUrl }: AnalysisJsonLdArgs) {
    const songName = result.song?.songName || 'Unknown song';
    const artistName = result.song?.artistName;
    const { iso, year } = parseDate(result.date);
    const byLine = artistName ? ` by ${artistName}` : '';
    const keywords = (result.themes ?? []).map((theme) => theme.replace(/_/g, ' ').trim()).filter(Boolean);

    return {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: `LyricsRay analysis of "${songName}"${byLine}`,
        description: result.summary || `Age-appropriateness analysis of "${songName}"${byLine}.`,
        text: result.analysis?.trim() || undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        url: pageUrl,
        inLanguage: 'en',
        datePublished: iso,
        about: {
            '@type': 'MusicRecording',
            name: songName,
            byArtist: artistName ? { '@type': 'MusicGroup', name: artistName } : undefined,
        },
        ...buildRights({ baseUrl, pageUrl, year }),
    };
}

interface ArtistJsonLdArgs {
    artistName: string;
    songCount: number;
    pageUrl: string;
    baseUrl: string;
}

/** schema.org description of an artist's page listing analyzed songs, including its ownership and credit terms. */
export function buildArtistJsonLd({ artistName, songCount, pageUrl, baseUrl }: ArtistJsonLdArgs) {
    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${artistName} song analysis`,
        description: `LyricsRay's age-appropriateness analysis for ${songCount} ${songCount === 1 ? 'song' : 'songs'} by ${artistName}.`,
        url: pageUrl,
        inLanguage: 'en',
        about: { '@type': 'MusicGroup', name: artistName },
        ...buildRights({ baseUrl, pageUrl }),
    };
}

/** Serializes to JSON that is safe inside a script tag: `<` is escaped so data can never close the tag. */
export function serializeJsonLd(data: object): string {
    return JSON.stringify(data).replace(/</g, '\\u003c');
}
