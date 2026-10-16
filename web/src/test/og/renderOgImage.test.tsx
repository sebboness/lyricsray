import { describe, it, expect, vi, beforeEach } from 'vitest';

const { MockImageResponse, mockLoadOgFonts } = vi.hoisted(() => {
    class MockImageResponse {
        constructor(public element: unknown, public options: Record<string, unknown>) {}
    }
    return { MockImageResponse, mockLoadOgFonts: vi.fn() };
});

vi.mock('next/og', () => ({ ImageResponse: MockImageResponse }));
vi.mock('@/og/ogFonts', () => ({ loadOgFonts: mockLoadOgFonts }));

import { OG_CACHE_SECONDS, ogNotFoundResponse, renderOgImage } from '@/og/renderOgImage';

beforeEach(() => {
    vi.clearAllMocks();
    mockLoadOgFonts.mockResolvedValue([{ name: 'F' }]);
});

describe('renderOgImage', () => {
    it('renders at 1200x630 with the loaded fonts', async () => {
        const response = (await renderOgImage(<div />, 100)) as unknown as InstanceType<typeof MockImageResponse>;

        expect(response.options).toMatchObject({ width: 1200, height: 630, fonts: [{ name: 'F' }] });
    });

    it('sets a CDN cache header with s-maxage and a seven-times stale-while-revalidate window', async () => {
        const response = (await renderOgImage(<div />, 100)) as unknown as InstanceType<typeof MockImageResponse>;

        expect(response.options.headers).toEqual({ 'Cache-Control': 'public, s-maxage=100, stale-while-revalidate=700' });
    });

    it('rejects when fonts cannot be loaded', async () => {
        mockLoadOgFonts.mockRejectedValue(new Error('missing font'));

        await expect(renderOgImage(<div />, 100)).rejects.toThrow('missing font');
    });
});

describe('ogNotFoundResponse', () => {
    it('is an empty 404 cached briefly', async () => {
        const response = ogNotFoundResponse();

        expect(response.status).toBe(404);
        expect(await response.text()).toBe('');
        expect(response.headers.get('Cache-Control')).toBe(`public, s-maxage=${OG_CACHE_SECONDS.missing}`);
    });
});
