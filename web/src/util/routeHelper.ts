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
 * Gets the route path for a song analysis result.
 * @param songKey The song key.
 * @returns Route path for a song analysis result.
 */
export const getAnalysisDetailsPath = (songKey: string) => `${getBaseUrl()}/analysis/${encodeURIComponent(songKey)}`;