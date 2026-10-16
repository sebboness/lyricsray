import { readOgAsset } from '@/og/ogAssets';

let cachedLogo: Promise<string> | null = null;

/** The LyricsRay logo as a data URI, so the renderer needs no network request for it. */
export function loadOgLogo(): Promise<string> {
    cachedLogo ??= readOgAsset('logo.png')
        .then((data) => `data:image/png;base64,${data.toString('base64')}`)
        .catch((error) => {
            cachedLogo = null;
            throw error;
        });

    return cachedLogo;
}
