/**
 * Gets the base URL of this app and handles SSR/client.
 * @returns The base URL of this app.
 */
export const getBaseUrl = () => {
    return typeof window !== 'undefined'
        ? window.location.origin
        : process.env.APP_URL || '';
}

/**
 * Percent-encodes a song key for safe use in a URL path, without breaking the
 * `/`-separated segments the `analysis/[...songKeys]` catch-all route relies on.
 *
 * Current song keys are `artist/song/hash`, already URL-safe per segment. But
 * songs analyzed before the key-format migration (see git history around
 * `ca8ffa9`) are still stored with their original `artist|song#hash` key — a
 * single opaque segment containing an un-encoded `#`. Interpolating that raw
 * into an <a href> makes the browser treat everything from the `#` onward as a
 * fragment, so it's silently dropped and never reaches the server (404).
 *
 * Splitting on `/` first means: new keys (multiple already-safe segments) are
 * re-encoded per segment, a harmless no-op; old keys (no `/`, one opaque
 * segment) get their unsafe characters like `#`/`|` properly escaped as a
 * single segment. Either way this round-trips correctly through Next's
 * automatic per-segment decoding of catch-all route params.
 */
export const encodeSongKeyForPath = (songKey: string) => songKey.split('/').map(encodeURIComponent).join('/');

/**
 * Gets the route path for a song analysis result.
 * @param songKey The song key.
 * @returns Route path for a song analysis result.
 */
export const getAnalysisDetailsPath = (songKey: string) => `${getBaseUrl()}/analysis/${encodeSongKeyForPath(songKey)}`;
