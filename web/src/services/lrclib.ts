import { Api } from "./api";

const baseUrl = "https://lrclib.net/api";

export interface SearchSongRequest {
    songName: string;
    artist: string;
}

export interface SongSearchResult {
    id: string;
    albumName?: string;
    artistName: string;
    duration: number;
    instrumental: boolean;
    name: string;
    plainLyrics?: string;
    thumbnail?: string;
    trackName: string;
    syncedLyrics?: string;
}

export interface SearchSongResponse {
    songs: SongSearchResult[];
    error?: string;
}

const module = "LrcLib";

/**
 * Wrapper for the LrcLib lyrics search API.
 */
export class LrcLibApi extends Api {
    private static instance: LrcLibApi;

    constructor() {
        super(baseUrl, module);
    }

    /**
     * Returns the current LrcLib API instance.
     * @returns The current LrcLib API instance
     */
    public static getInstance(): LrcLibApi {
        if (!LrcLibApi.instance) {
            LrcLibApi.instance = new LrcLibApi();
        }
        return LrcLibApi.instance;
    }

    /**
     * Searches for lyrics given a song name and an optional artist name.
     * @param songName The name of the song
     * @param artist The name of the artist (optional)
     * @returns A promise with a result set to an array of songs
     */
    public searchLyrics = async (songName: string, artist: string | null | undefined): Promise<SongSearchResult[]> => {
        const _artist = artist ? ` by ${artist}` : "";
        return this.get<SongSearchResult[]>("search", {
            queryParams: {
                q: [`${songName}${_artist}`],
            }
        });
    }
}