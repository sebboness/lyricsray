import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRateLimitedUntil, setRateLimitedUntil, clearRateLimitedUntil, formatRemainingTime } from '@/util/rateLimitClient';

beforeEach(() => {
    sessionStorage.clear();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
});

afterEach(() => {
    vi.useRealTimers();
});

describe('setRateLimitedUntil / getRateLimitedUntil', () => {
    it('returns null when nothing is stored', () => {
        expect(getRateLimitedUntil()).toBeNull();
    });

    it('stores and returns the cooldown timestamp', () => {
        const until = setRateLimitedUntil(3600);
        expect(until).toBe(Date.now() + 3600 * 1000);
        expect(getRateLimitedUntil()).toBe(until);
    });

    it('clamps negative retryAfter values to 0', () => {
        const until = setRateLimitedUntil(-10);
        expect(until).toBe(Date.now());
    });

    it('treats an expired cooldown as absent and clears it', () => {
        setRateLimitedUntil(10);
        vi.setSystemTime(new Date('2026-01-01T12:00:11.000Z')); // 11s later, past the 10s cooldown

        expect(getRateLimitedUntil()).toBeNull();
        expect(sessionStorage.getItem('lyricsray_rate_limited_until')).toBeNull();
    });

    it('ignores corrupted storage values', () => {
        sessionStorage.setItem('lyricsray_rate_limited_until', 'not-a-number');
        expect(getRateLimitedUntil()).toBeNull();
    });
});

describe('clearRateLimitedUntil', () => {
    it('removes any stored cooldown', () => {
        setRateLimitedUntil(3600);
        clearRateLimitedUntil();
        expect(getRateLimitedUntil()).toBeNull();
    });
});

describe('formatRemainingTime', () => {
    it('formats seconds only', () => {
        expect(formatRemainingTime(30)).toBe('30s');
    });

    it('formats minutes and seconds when under 5 minutes', () => {
        expect(formatRemainingTime(4 * 60 + 15)).toBe('4m 15s');
    });

    it('formats minutes only when 5 minutes or more', () => {
        expect(formatRemainingTime(5 * 60 + 15)).toBe('5m');
    });

    it('formats hours and minutes', () => {
        expect(formatRemainingTime(2 * 3600 + 15 * 60)).toBe('2h 15m');
    });

    it('formats whole hours without minutes', () => {
        expect(formatRemainingTime(3 * 3600)).toBe('3h');
    });

    it('clamps negative input to 0s', () => {
        expect(formatRemainingTime(-5)).toBe('0s');
    });
});
