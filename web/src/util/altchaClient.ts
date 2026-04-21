const ALTCHA_CACHE_KEY = 'altcha_payload';

export const ALTCHA_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes

export function getCachedAltcha() {
    try {
        const raw = localStorage.getItem(ALTCHA_CACHE_KEY);
        if (!raw) return null;
        const { payload, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp > ALTCHA_EXPIRY_MS) {
            localStorage.removeItem(ALTCHA_CACHE_KEY);
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

export function setCachedAltcha(payload: string) {
    typeof localStorage !== 'undefined'
        && localStorage.setItem(ALTCHA_CACHE_KEY, JSON.stringify({ payload, timestamp: Date.now() }));
}

export function clearCachedAltcha() {
    typeof localStorage !== 'undefined'
        && localStorage.removeItem(ALTCHA_CACHE_KEY);
}