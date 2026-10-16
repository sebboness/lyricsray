import { ImageResponse } from 'next/og';
import type { ReactElement } from 'react';
import { loadOgFonts } from '@/og/ogFonts';
import { OG_SIZE } from '@/og/ogStyles';

export const OG_CACHE_SECONDS = {
    analysis: 60 * 60 * 24,
    artist: 60 * 60,
    missing: 60,
} as const;

/** Renders a card to a PNG that CDNs may cache for `cacheSeconds` and serve stale for a week while refreshing. */
export async function renderOgImage(element: ReactElement, cacheSeconds: number): Promise<ImageResponse> {
    return new ImageResponse(element, {
        ...OG_SIZE,
        fonts: await loadOgFonts(),
        headers: {
            'Cache-Control': `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 7}`,
        },
    });
}

/** A cheap 404 for pages with no data, so unknown URLs never cost an image render. */
export function ogNotFoundResponse(): Response {
    return new Response(null, {
        status: 404,
        headers: { 'Cache-Control': `public, s-maxage=${OG_CACHE_SECONDS.missing}` },
    });
}
