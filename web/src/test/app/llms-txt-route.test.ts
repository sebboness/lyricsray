import { describe, it, expect, vi, afterEach } from 'vitest';
import { GET } from '@/app/llms.txt/route';

describe('GET /llms.txt', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('serves plain text with a cache header', async () => {
        const response = GET();

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
        expect(response.headers.get('Cache-Control')).toContain('s-maxage');
        expect((await response.text()).startsWith('# LyricsRay')).toBe(true);
    });

    it('builds links from APP_URL on the server', async () => {
        vi.stubGlobal('window', undefined);
        vi.stubEnv('APP_URL', 'https://lyricsray.hexonite.net');

        expect(await GET().text()).toContain('https://lyricsray.hexonite.net/privacy-and-terms');
    });
});
