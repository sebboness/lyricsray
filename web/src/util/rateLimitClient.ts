const RATE_LIMIT_STORAGE_KEY = 'lyricsray_rate_limited_until';

/**
 * Returns the timestamp (ms since epoch) the user is rate-limited until, if a
 * cooldown is still active, or null otherwise. Clears an expired entry so
 * sessionStorage doesn't accumulate stale state.
 *
 * This only improves UX (so refreshing the page doesn't hide an active
 * cooldown and invite an immediate resubmit that the server will reject
 * anyway) — the server's DynamoDB-backed rate limiter remains the sole
 * source of truth for actually enforcing the limit.
 */
export function getRateLimitedUntil(): number | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(RATE_LIMIT_STORAGE_KEY);
        if (!raw) return null;

        const until = parseInt(raw, 10);
        if (isNaN(until) || until <= Date.now()) {
            sessionStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
            return null;
        }

        return until;
    } catch {
        return null;
    }
}

/**
 * Persists a rate-limit cooldown for the rest of the browser session.
 * @param retryAfterSeconds Seconds until the user may retry, from the API's Retry-After value
 * @returns The absolute timestamp (ms since epoch) the cooldown ends
 */
export function setRateLimitedUntil(retryAfterSeconds: number): number {
    const until = Date.now() + Math.max(0, retryAfterSeconds) * 1000;

    if (typeof window !== 'undefined') {
        try {
            sessionStorage.setItem(RATE_LIMIT_STORAGE_KEY, until.toString());
        } catch {
            // ignore storage errors (e.g. private browsing with storage disabled)
        }
    }

    return until;
}

export function clearRateLimitedUntil(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
    } catch {
        // ignore
    }
}

/**
 * Formats a number of seconds into a short, friendly duration string
 * (e.g. "2h 15m", "45m", "30s").
 */
export function formatRemainingTime(totalSeconds: number): string {
    const s = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    if (minutes > 0) {
        return seconds > 0 && minutes < 5 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
}
