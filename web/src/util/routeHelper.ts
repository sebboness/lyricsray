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
 * Encodes a song key for use in a URL path, if needed. Current-format keys are
 * already percent-encoded at creation time (see `encodeUri` in
 * `api/src/util/songKey.ts`), so re-encoding would double-escape them — a raw
 * `#` is a reliable signal this is instead a legacy, fully-unencoded key
 * (pre-`ca8ffa9`) that needs a full single-segment encode.
 */
export const encodeSongKeyForPath = (songKey: string) => (songKey.includes('#') ? encodeURIComponent(songKey) : songKey);

/**
 * Gets the route path for a song analysis result.
 * @param songKey The song key.
 * @returns Route path for a song analysis result.
 */
export const getAnalysisDetailsPath = (songKey: string) => `${getBaseUrl()}/analysis/${encodeSongKeyForPath(songKey)}`;
