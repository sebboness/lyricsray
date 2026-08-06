import { makeKey } from './hash';

const encodeUri = (query: string) => encodeURIComponent(query).replace(/(%20)+/g, '-');

/**
 * @param artistName The name of the artist
 * @param songName The name of the song
 * @param lyrics The lyrics of the song from which a hash will be derived
 * @returns The song key used to identify the song
 */
export function makeSongKey(artistName: string | undefined, songName: string | undefined, lyrics: string): string {
  const artistPart = artistName ? encodeUri(artistName.slice(0, 50).trim()) : '-';
  const songPart = songName ? encodeUri(songName.slice(0, 50).trim()) : '-';
  const songKeyPrefix = `${artistPart}/${songPart}/`;
  const songKey = makeKey(lyrics, songKeyPrefix);
  return songKey.replace(/\s+/g, '-');
}
