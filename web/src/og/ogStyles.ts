import { verdict } from '@/theme/theme';

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_COLORS = {
    background: '#0a0a10',
    paper: '#14151d',
    border: '#23242f',
    track: '#23242f',
    textPrimary: '#eef1f4',
    textSecondary: '#8a939e',
    brand: '#9d90ff',
    unknown: '#8a939e',
    verdict,
} as const;

export interface OgVerdictTokens {
    color: string;
    border: string;
    surface: string;
}

const UNKNOWN_TOKENS: OgVerdictTokens = { color: OG_COLORS.unknown, border: '#23242f', surface: '#14151d' };

/** Color, border and surface for a verdict key; anything unrecognised gets neutral tokens. */
export function getOgVerdictTokens(verdictKey: string): OgVerdictTokens {
    if (verdictKey === 'safe' || verdictKey === 'caution' || verdictKey === 'blocked') {
        const { main, border, surface } = verdict[verdictKey];
        return { color: main, border, surface };
    }
    return UNKNOWN_TOKENS;
}

export const OG_FONT_SANS = 'Space Grotesk';
export const OG_FONT_MONO = 'JetBrains Mono';
