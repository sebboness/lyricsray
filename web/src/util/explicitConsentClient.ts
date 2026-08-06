const EXPLICIT_CONSENT_KEY = 'lyricsray_explicit_consent';
const EXPLICIT_CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years

function readConsentCookie(): boolean {
    if (typeof document === 'undefined') return false;
    return document.cookie
        .split('; ')
        .some((entry) => entry === `${EXPLICIT_CONSENT_KEY}=true`);
}

function writeConsentCookie(): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${EXPLICIT_CONSENT_KEY}=true; max-age=${EXPLICIT_CONSENT_COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
}

/**
 * Returns whether the user has previously confirmed they are old enough to
 * view mature-rated lyrics. This is a client-only UX convenience so users
 * aren't asked repeatedly across pages; it does not gate anything server-side.
 */
export function hasExplicitConsent(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return localStorage.getItem(EXPLICIT_CONSENT_KEY) === 'true';
    } catch {
        return readConsentCookie();
    }
}

/**
 * Persists the user's age confirmation indefinitely (site-wide, no expiry).
 */
export function setExplicitConsent(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(EXPLICIT_CONSENT_KEY, 'true');
    } catch {
        writeConsentCookie();
    }
}
