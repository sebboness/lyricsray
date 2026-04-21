import { makeKey } from "./hash";

/**
 * Encodes the given query string into a URI component.
 * @param query The query string to encode
 * @returns An encoded query string.
 */
export const encodeUri = (query: string) => encodeURIComponent(query).replace(/(\%20)+/g, '+');

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
export const getAnalysisDetailsPath = (songKey: string) => `${getBaseUrl()}/analysis/${songKey}`;

/**
 * 
 * @param artistName The name of the artist
 * @param songName The name of the song
 * @param lyrics The lyrics of the song from which a hash will be defined
 * @returns The song key used to identify the song
 */
export function makeSongKey(artistName: string | undefined, songName: string | undefined, lyrics: string): string {
    const artistPart = artistName ? encodeUri(artistName) : '-';
    const songPart = songName ? encodeUri(songName) : '-';
    const songKeyPrefix = `${artistPart}/${songPart}/`;
    const songKey = makeKey(lyrics, songKeyPrefix);
    return songKey.replace(/\s+/g, '+');
}