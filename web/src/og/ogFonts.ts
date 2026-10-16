import { readOgAsset, toArrayBuffer } from '@/og/ogAssets';
import { OG_FONT_MONO, OG_FONT_SANS } from '@/og/ogStyles';

export interface OgFont {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 500 | 700;
    style: 'normal';
}

const FONT_FILES: { name: string; weight: OgFont['weight']; file: string }[] = [
    { name: OG_FONT_SANS, weight: 500, file: 'space-grotesk-latin-500-normal.woff' },
    { name: OG_FONT_SANS, weight: 700, file: 'space-grotesk-latin-700-normal.woff' },
    { name: OG_FONT_MONO, weight: 400, file: 'jetbrains-mono-latin-400-normal.woff' },
    { name: OG_FONT_MONO, weight: 700, file: 'jetbrains-mono-latin-700-normal.woff' },
];

let cachedFonts: Promise<OgFont[]> | null = null;

/** Loads the same Space Grotesk and JetBrains Mono families the site uses, as static files the renderer can read. */
export function loadOgFonts(): Promise<OgFont[]> {
    cachedFonts ??= Promise.all(
        FONT_FILES.map(async ({ name, weight, file }): Promise<OgFont> => ({
            name,
            weight,
            style: 'normal',
            data: toArrayBuffer(await readOgAsset(file)),
        }))
    ).catch((error) => {
        cachedFonts = null;
        throw error;
    });

    return cachedFonts;
}
