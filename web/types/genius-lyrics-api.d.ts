declare module 'genius-lyrics-api' {
    /**
     * Returns a promise that resolves to a url (string) to the song's album art. Returns null if no url is found.
     * @param options Search options
     */
    export const getAlbumArt = (options: Options | string): Promise<string | null> => {}

    /**
     * Returns a promise that resolves to a string containing lyrics. Returns null if no lyrics are found.
     * @param options Search options
     */
    export const getLyrics = (options: Options | string): Promise<string | null> => {}

    /**
     * Returns a promise that resolves to an object of type song. Returns null if song is not found.
     * @param options Search options
     */
    export const getSong = (options: Options): Promise<Song | null> => {}

    /**
     * Returns a promise that resolves to an array of type searchResult. Returns null if no matches are found.
     * @param options Search options
     */
    export const searchSong = (options: Options): Promise<SearchResult[] | null> => {}

    export interface Options {
        title: string;
        artist: string;
        apiKey: string;		     // Genius developer access token
        optimizeQuery?: boolean; // (optional, default: false) If true, perform some cleanup to maximize the chance of finding a match
        authHeader?: boolean;    // (optional, default: false) Whether to include auth header in the search request
    }

    export interface Song {
        id: number;		    // Genius song id
        title: string;      // Song title
        url: string;		// Genius webpage URL for the song
        lyrics: string;		// Song lyrics
        albumArt: string;	// URL of the album art image (jpg/png)
    }

    export interface SearchResult {
        id: number;		    // Genius song id
        url: string;		// Genius webpage URL for the song
        title: string;		// Song title
        albumArt: string;	// URL of the album art image (jpg/png)
    }
}