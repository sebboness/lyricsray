import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockReadOgAsset } = vi.hoisted(() => ({ mockReadOgAsset: vi.fn() }));

vi.mock('@/og/ogAssets', async () => {
    const actual = await vi.importActual<typeof import('@/og/ogAssets')>('@/og/ogAssets');
    return { ...actual, readOgAsset: mockReadOgAsset };
});

describe('loadOgFonts', () => {
    beforeEach(() => {
        vi.resetModules();
        mockReadOgAsset.mockReset();
        mockReadOgAsset.mockImplementation(async () => Buffer.from([1, 2, 3]));
    });

    it('loads the sans and mono families at their weights', async () => {
        const { loadOgFonts } = await import('@/og/ogFonts');

        const fonts = await loadOgFonts();

        expect(fonts.map((f) => `${f.name}:${f.weight}`)).toEqual([
            'Space Grotesk:500',
            'Space Grotesk:700',
            'JetBrains Mono:400',
            'JetBrains Mono:700',
        ]);
        expect(fonts.every((f) => f.data.byteLength === 3)).toBe(true);
    });

    it('reads the files only once across calls', async () => {
        const { loadOgFonts } = await import('@/og/ogFonts');

        await loadOgFonts();
        await loadOgFonts();

        expect(mockReadOgAsset).toHaveBeenCalledTimes(4);
    });

    it('does not cache a failure, so the next call retries', async () => {
        const { loadOgFonts } = await import('@/og/ogFonts');
        mockReadOgAsset.mockRejectedValueOnce(new Error('ENOENT'));

        await expect(loadOgFonts()).rejects.toThrow('ENOENT');
        await expect(loadOgFonts()).resolves.toHaveLength(4);
    });
});
