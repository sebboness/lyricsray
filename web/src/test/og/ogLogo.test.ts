import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockReadOgAsset } = vi.hoisted(() => ({ mockReadOgAsset: vi.fn() }));

vi.mock('@/og/ogAssets', () => ({ readOgAsset: mockReadOgAsset }));

describe('loadOgLogo', () => {
    beforeEach(() => {
        vi.resetModules();
        mockReadOgAsset.mockReset();
        mockReadOgAsset.mockResolvedValue(Buffer.from('hello'));
    });

    it('returns the logo as a PNG data URI', async () => {
        const { loadOgLogo } = await import('@/og/ogLogo');

        expect(await loadOgLogo()).toBe(`data:image/png;base64,${Buffer.from('hello').toString('base64')}`);
    });

    it('reads the file only once', async () => {
        const { loadOgLogo } = await import('@/og/ogLogo');

        await loadOgLogo();
        await loadOgLogo();

        expect(mockReadOgAsset).toHaveBeenCalledTimes(1);
    });

    it('does not cache a failure, so the next call retries', async () => {
        const { loadOgLogo } = await import('@/og/ogLogo');
        mockReadOgAsset.mockRejectedValueOnce(new Error('ENOENT'));

        await expect(loadOgLogo()).rejects.toThrow('ENOENT');
        await expect(loadOgLogo()).resolves.toContain('data:image/png;base64,');
    });
});
