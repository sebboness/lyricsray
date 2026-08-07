export type TrackEventType = 'share' | 'cta' | 'externalLink';

/** Fire-and-forget POST to /api/track. Never throws, never awaited by callers. */
export function trackEvent(eventType: TrackEventType, payload: Record<string, string>): void {
    void fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, payload }),
        keepalive: true,
    })?.catch(() => { /* silently ignore */ });
}
