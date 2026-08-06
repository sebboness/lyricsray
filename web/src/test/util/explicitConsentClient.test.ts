import { describe, it, expect, beforeEach } from 'vitest';
import { hasExplicitConsent, setExplicitConsent } from '@/util/explicitConsentClient';

beforeEach(() => {
    localStorage.clear();
    document.cookie = 'lyricsray_explicit_consent=; max-age=0; path=/';
});

describe('hasExplicitConsent / setExplicitConsent (localStorage)', () => {
    it('returns false when nothing is stored', () => {
        expect(hasExplicitConsent()).toBe(false);
    });

    it('returns true after consent has been set', () => {
        setExplicitConsent();
        expect(hasExplicitConsent()).toBe(true);
    });

    it('persists across separate reads without re-setting', () => {
        setExplicitConsent();
        expect(hasExplicitConsent()).toBe(true);
        expect(hasExplicitConsent()).toBe(true);
    });

    it('ignores unexpected stored values', () => {
        localStorage.setItem('lyricsray_explicit_consent', 'yes-please');
        expect(hasExplicitConsent()).toBe(false);
    });
});

describe('hasExplicitConsent / setExplicitConsent (cookie fallback)', () => {
    it('falls back to a cookie when localStorage.setItem throws', () => {
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = () => { throw new Error('storage disabled'); };

        try {
            setExplicitConsent();
        } finally {
            Storage.prototype.setItem = originalSetItem;
        }

        expect(document.cookie).toContain('lyricsray_explicit_consent=true');
    });

    it('falls back to reading the cookie when localStorage.getItem throws', () => {
        document.cookie = 'lyricsray_explicit_consent=true; path=/';

        const originalGetItem = Storage.prototype.getItem;
        Storage.prototype.getItem = () => { throw new Error('storage disabled'); };

        try {
            expect(hasExplicitConsent()).toBe(true);
        } finally {
            Storage.prototype.getItem = originalGetItem;
        }
    });

    it('does not throw when both localStorage and cookies are unavailable', () => {
        const originalGetItem = Storage.prototype.getItem;
        const originalSetItem = Storage.prototype.setItem;
        const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
        Storage.prototype.getItem = () => { throw new Error('storage disabled'); };
        Storage.prototype.setItem = () => { throw new Error('storage disabled'); };
        Object.defineProperty(document, 'cookie', { configurable: true, get: () => '', set: () => {} });

        try {
            expect(() => setExplicitConsent()).not.toThrow();
            expect(hasExplicitConsent()).toBe(false);
        } finally {
            Storage.prototype.getItem = originalGetItem;
            Storage.prototype.setItem = originalSetItem;
            if (originalCookieDescriptor) {
                Object.defineProperty(document, 'cookie', originalCookieDescriptor);
            }
        }
    });
});
