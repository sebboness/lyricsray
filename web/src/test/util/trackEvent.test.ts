import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackEvent } from '@/util/trackEvent';

describe('trackEvent', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    it('POSTs to /api/track with the correct body and keepalive', () => {
        trackEvent('share', { shareMethod: 'whatsapp', songKey: 'Artist/Song/hash' });

        expect(fetchSpy).toHaveBeenCalledOnce();
        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe('/api/track');
        expect(init?.method).toBe('POST');
        expect(init?.keepalive).toBe(true);
        expect(JSON.parse(init?.body as string)).toEqual({
            eventType: 'share',
            payload: { shareMethod: 'whatsapp', songKey: 'Artist/Song/hash' },
        });
    });

    it('sends the correct eventType and payload for cta events', () => {
        trackEvent('cta', { ctaAction: 'clicked', ctaType: 'kofi' });

        const [, init] = fetchSpy.mock.calls[0];
        expect(JSON.parse(init?.body as string)).toEqual({
            eventType: 'cta',
            payload: { ctaAction: 'clicked', ctaType: 'kofi' },
        });
    });

    it('sends the correct eventType and payload for externalLink events', () => {
        trackEvent('externalLink', { linkTarget: 'hexonite', linkContext: 'footer' });

        const [, init] = fetchSpy.mock.calls[0];
        expect(JSON.parse(init?.body as string)).toEqual({
            eventType: 'externalLink',
            payload: { linkTarget: 'hexonite', linkContext: 'footer' },
        });
    });

    it('swallows fetch rejections without throwing', async () => {
        fetchSpy.mockRejectedValue(new Error('network error'));

        // Should not throw; function is fire-and-forget
        expect(() => trackEvent('share', { shareMethod: 'copy', songKey: 'k' })).not.toThrow();

        // Give the microtask queue a tick to resolve the rejected promise
        await new Promise(resolve => setTimeout(resolve, 0));
        // Still no unhandled rejection error — test passes if we get here
    });
});
