import { describe, it, expect } from 'vitest';
import { makeSongKey } from './songKey';

describe('makeSongKey', () => {
    function splitKey(key: string): { artistPart: string; songPart: string; hash: string } {
        const parts = key.split('/');
        return { artistPart: parts[0], songPart: parts[1], hash: parts[2] };
    }

    it('encodes spaces as hyphens in both artist and song name', () => {
        const { artistPart, songPart } = splitKey(makeSongKey('Ariana Grande', 'Thank U Next', 'lyrics'));
        expect(artistPart).toBe('Ariana-Grande');
        expect(songPart).toBe('Thank-U-Next');
    });

    it('encodes literal + in song name as %2B, not as a space proxy', () => {
        // "34+35" by Ariana Grande — the + is part of the title, not a word separator
        const { artistPart, songPart, hash } = splitKey(makeSongKey('Ariana Grande', '34+35', 'lyrics'));
        expect(artistPart).toBe('Ariana-Grande');
        expect(songPart).toBe('34%2B35');
        expect(hash).toHaveLength(24);
    });

    it('encodes literal + in artist name as %2B', () => {
        const { artistPart } = splitKey(makeSongKey('AC+DC', 'Highway to Hell', 'lyrics'));
        expect(artistPart).toBe('AC%2BDC');
    });

    it('percent-encodes Korean artist name as UTF-8 sequences', () => {
        const { artistPart } = splitKey(makeSongKey('이승기', 'A Song', 'lyrics'));
        expect(artistPart).toBe(encodeURIComponent('이승기'));
    });

    it('encodes parens and commas in long song title, preserves literal hyphens', () => {
        // "A Song To Make You Smile (featuring RM, j-hope, and Hareem)" by 이승기
        // Spaces → -, ( → %28, ) → %29, , → %2C, literal hyphen in j-hope stays as -
        // The title is 60 chars so makeSongKey truncates it to 50 before encoding.
        const song = 'A Song To Make You Smile (featuring RM, j-hope, and Hareem)';
        const { songPart } = splitKey(makeSongKey('이승기', song, 'lyrics'));
        const expected = encodeURIComponent(song.slice(0, 50).trim()).replace(/(%20)+/g, '-');
        expect(songPart).toBe(expected);
        expect(songPart).toContain('j-hope');         // literal hyphen preserved
        expect(songPart).toContain('(featuring');    // ( is unreserved — not encoded
        expect(songPart).toContain('RM%2C');          // , is encoded
    });

    it('encodes + = < in song name ("u + me = <3" by Aliah)', () => {
        // spaces → -, + → %2B, = → %3D, < → %3C
        const { artistPart, songPart, hash } = splitKey(makeSongKey('Aliah', 'u + me = <3', 'lyrics'));
        expect(artistPart).toBe('Aliah');
        expect(songPart).toBe('u-%2B-me-%3D-%3C3');
        expect(hash).toHaveLength(24);
    });

    it('produces a deterministic 24-character hash for the same inputs', () => {
        const key1 = makeSongKey('Aliah', 'u + me = <3', 'the same lyrics');
        const key2 = makeSongKey('Aliah', 'u + me = <3', 'the same lyrics');
        expect(key1).toBe(key2);
        expect(splitKey(key1).hash).toHaveLength(24);
    });

    it('produces a different hash when lyrics change, but the same prefix', () => {
        const key1 = makeSongKey('Ariana Grande', '34+35', 'verse one lyrics here');
        const key2 = makeSongKey('Ariana Grande', '34+35', 'completely different set of lyrics');
        expect(key1).not.toBe(key2);
        expect(key1.startsWith('Ariana-Grande/34%2B35/')).toBe(true);
        expect(key2.startsWith('Ariana-Grande/34%2B35/')).toBe(true);
    });

    it('uses a hyphen placeholder when artist name is undefined', () => {
        const key = makeSongKey(undefined, 'Some Song', 'lyrics');
        expect(key.startsWith('-/Some-Song/')).toBe(true);
    });

    it('uses a hyphen placeholder when song name is undefined', () => {
        const key = makeSongKey('Ariana Grande', undefined, 'lyrics');
        expect(key.startsWith('Ariana-Grande/-/')).toBe(true);
    });

    it('truncates artist and song names to 50 characters before encoding', () => {
        const longArtist = 'A'.repeat(60);
        const longSong = 'B'.repeat(60);
        const { artistPart, songPart } = splitKey(makeSongKey(longArtist, longSong, 'lyrics'));
        expect(artistPart).toBe('A'.repeat(50));
        expect(songPart).toBe('B'.repeat(50));
    });

    it('produces a 3-segment key (artist/song/hash) for all edge-case inputs', () => {
        const cases: [string | undefined, string | undefined, string][] = [
            ['Ariana Grande', '34+35', 'lyrics 1'],
            ['이승기', 'A Song To Make You Smile (featuring RM, j-hope, and Hareem)', 'lyrics 2'],
            ['Aliah', 'u + me = <3', 'lyrics 3'],
        ];
        for (const [artist, song, lyrics] of cases) {
            const parts = makeSongKey(artist, song, lyrics).split('/');
            expect(parts).toHaveLength(3);
            expect(parts[2]).toHaveLength(24);
        }
    });
});
