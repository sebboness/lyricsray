import { describe, it, expect } from 'vitest';
import { encodeSongKeyForPath, getAnalysisDetailsPath } from '@/util/routeHelper';

describe('encodeSongKeyForPath', () => {
    // Current-format keys are already percent-encoded at creation time (see
    // encodeUri in api/src/util/songKey.ts) — re-encoding here would double-escape
    // already-safe sequences, corrupting the key so it no longer matches storage.
    it('leaves a current-format key completely untouched', () => {
        const songKey = 'The+Who/Tommy%2C+Can+You+Hear+Me%3F/782af9a42fb4b5b3d12a06ce';

        expect(encodeSongKeyForPath(songKey)).toBe(songKey);
    });

    it('does not double-escape an already-encoded comma/question-mark segment', () => {
        const songKey = 'Guster/Terrified/b447180cf8ad8150abcdef1234567890';

        expect(encodeSongKeyForPath(songKey)).toBe(songKey);
    });

    // Regression test: songs analyzed before the key-format migration (git history
    // around ca8ffa9) are still stored with their original `artist|song#hash` key —
    // a single opaque, completely unencoded string with a raw "#". Left raw in an
    // <a href>, the browser treats everything from "#" onward as a fragment and
    // never sends it to the server, producing a 404 for an otherwise-valid,
    // existing analysis.
    it('percent-encodes a legacy pipe/hash-format key as a single safe segment', () => {
        const legacyKey = 'Guster|Terrified#b447180cf8ad8150';

        const encoded = encodeSongKeyForPath(legacyKey);

        expect(encoded).toBe('Guster%7CTerrified%23b447180cf8ad8150');
        expect(encoded).not.toContain('#');
        expect(decodeURIComponent(encoded)).toBe(legacyKey);
    });

    it('encodes a legacy key even when the artist name itself contains a raw "/"', () => {
        // e.g. "AC/DC" — since legacy keys were never encoded at all, that "/" is
        // just incidental text, not a meaningful path separator, and must not be
        // treated as one.
        const legacyKey = 'AC/DC|Highway to Hell#abc123';

        const encoded = encodeSongKeyForPath(legacyKey);

        expect(encoded.split('/')).toHaveLength(1);
        expect(decodeURIComponent(encoded)).toBe(legacyKey);
    });
});

describe('getAnalysisDetailsPath', () => {
    it('builds a path with an unencoded current-format song key', () => {
        const path = getAnalysisDetailsPath('The+Who/Tommy%2C+Can+You+Hear+Me%3F/782af9a42fb4b5b3d12a06ce');

        expect(path).toContain('/analysis/The+Who/Tommy%2C+Can+You+Hear+Me%3F/782af9a42fb4b5b3d12a06ce');
    });

    it('builds a path with an encoded legacy song key', () => {
        const path = getAnalysisDetailsPath('Guster|Terrified#b447180cf8ad8150');

        expect(path).toContain('/analysis/Guster%7CTerrified%23b447180cf8ad8150');
    });
});
