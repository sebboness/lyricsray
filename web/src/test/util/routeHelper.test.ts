import { describe, it, expect } from 'vitest';
import { encodeSongKeyForPath, getAnalysisDetailsPath } from '@/util/routeHelper';

describe('encodeSongKeyForPath', () => {
    it('leaves a current-format key (already URL-safe segments) unchanged', () => {
        const songKey = 'Guster/Terrified/b447180cf8ad8150abcdef1234567890';

        expect(encodeSongKeyForPath(songKey)).toBe(songKey);
    });

    it('preserves "/" as real path separators for current-format keys', () => {
        const encoded = encodeSongKeyForPath('Guster/Terrified/abc123');

        expect(encoded.split('/')).toHaveLength(3);
    });

    // Regression test: songs analyzed before the key-format migration (git history
    // around ca8ffa9) are still stored with their original `artist|song#hash` key —
    // a single opaque segment with an un-encoded "#". Left raw in an <a href>, the
    // browser treats everything from "#" onward as a fragment and never sends it to
    // the server, producing a 404 for otherwise-valid, existing analyses.
    it('percent-encodes a legacy pipe/hash-format key as a single safe segment', () => {
        const legacyKey = 'Guster|Terrified#b447180cf8ad8150';

        const encoded = encodeSongKeyForPath(legacyKey);

        expect(encoded).toBe('Guster%7CTerrified%23b447180cf8ad8150');
        expect(encoded).not.toContain('#');
        expect(decodeURIComponent(encoded)).toBe(legacyKey);
    });

    it('round-trips a legacy key through split/encode/decode as one segment', () => {
        const legacyKey = 'Guster|Terrified#b447180cf8ad8150';

        const encoded = encodeSongKeyForPath(legacyKey);
        // Mirrors what Next.js does for a catch-all route: split on "/", decode each segment.
        const reconstructed = encoded.split('/').map(decodeURIComponent).join('/');

        expect(reconstructed).toBe(legacyKey);
    });
});

describe('getAnalysisDetailsPath', () => {
    it('builds a path with the encoded song key', () => {
        const path = getAnalysisDetailsPath('Guster|Terrified#b447180cf8ad8150');

        expect(path).toContain('/analysis/Guster%7CTerrified%23b447180cf8ad8150');
    });
});
