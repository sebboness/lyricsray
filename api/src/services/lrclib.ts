import { logger } from '../util/logger';

const BASE_URL = 'https://lrclib.net/api';

export interface SongSearchResult {
  id: string;
  albumName?: string;
  artistName: string;
  duration: number;
  instrumental: boolean;
  name: string;
  plainLyrics?: string;
  relevance: number;
  thumbnail?: string;
  trackName: string;
  syncedLyrics?: string;
}

/**
 * Thin wrapper for the LrcLib lyrics search API.
 */
export class LrcLibApi {
  private static instance: LrcLibApi;

  static getInstance(): LrcLibApi {
    if (!LrcLibApi.instance) {
      LrcLibApi.instance = new LrcLibApi();
    }
    return LrcLibApi.instance;
  }

  /**
   * Searches for lyrics given a song name and an optional artist name.
   */
  async searchLyrics(songName: string, artist: string | null | undefined): Promise<SongSearchResult[]> {
    const q = artist ? `${artist} - ${songName}` : songName;
    const url = `${BASE_URL}/search?q=${encodeURIComponent(q)}`;

    logger.info('lrclib search request', { url });

    const res = await fetch(url, {
      headers: {
        'User-Agent': `${process.env.APP_NAME ?? 'LyricsRay'} ${process.env.APP_VERSION ?? ''}`,
      },
    });

    if (!res.ok) {
      throw new Error(`LrcLib search failed with status ${res.status}`);
    }

    return (await res.json()) as SongSearchResult[];
  }
}
