import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readOgAsset, toArrayBuffer } from '@/og/ogAssets';

const sourceDir = join(process.cwd(), 'src', 'assets', 'og');

describe('readOgAsset', () => {
    it('returns the embedded fonts and logo', async () => {
        expect((await readOgAsset('logo.png')).subarray(1, 4).toString()).toBe('PNG');
        expect((await readOgAsset('space-grotesk-latin-700-normal.woff')).subarray(0, 4).toString()).toBe('wOFF');
        expect((await readOgAsset('jetbrains-mono-latin-400-normal.woff')).subarray(0, 4).toString()).toBe('wOFF');
    });

    it('matches the source files, so the generated module is not stale', async () => {
        for (const name of ['logo.png', 'space-grotesk-latin-500-normal.woff', 'jetbrains-mono-latin-700-normal.woff']) {
            expect((await readOgAsset(name)).equals(readFileSync(join(sourceDir, name)))).toBe(true);
        }
    });

    it('rejects for an unknown file name, including inherited object keys', async () => {
        await expect(readOgAsset('nope.woff')).rejects.toThrow('Unknown OG asset');
        await expect(readOgAsset('constructor')).rejects.toThrow('Unknown OG asset');
    });
});

describe('toArrayBuffer', () => {
    it('copies only the buffer view, not the whole backing pool', () => {
        const pool = Buffer.from([9, 9, 1, 2, 3, 9]);
        const view = pool.subarray(2, 5);

        expect(Array.from(new Uint8Array(toArrayBuffer(view)))).toEqual([1, 2, 3]);
    });
});
