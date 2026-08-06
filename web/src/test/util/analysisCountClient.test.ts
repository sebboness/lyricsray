import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { incrementAnalysisCount, shouldShowSupportPrompt, dismissSupportPrompt } from '@/util/analysisCountClient';

beforeEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('incrementAnalysisCount', () => {
    it('starts at 1 and increments on each call', () => {
        expect(incrementAnalysisCount()).toBe(1);
        expect(incrementAnalysisCount()).toBe(2);
        expect(incrementAnalysisCount()).toBe(3);
    });

    it('ignores corrupted storage and starts over', () => {
        localStorage.setItem('lyricsray_analysis_count', 'not-a-number');
        expect(incrementAnalysisCount()).toBe(1);
    });
});

describe('shouldShowSupportPrompt', () => {
    it('is false below the default first threshold', () => {
        vi.stubEnv('NEXT_PUBLIC_SUPPORT_PROMPT_FIRST_THRESHOLD', '5');
        expect(shouldShowSupportPrompt(4)).toBe(false);
    });

    it('is true at/above the default first threshold', () => {
        vi.stubEnv('NEXT_PUBLIC_SUPPORT_PROMPT_FIRST_THRESHOLD', '5');
        expect(shouldShowSupportPrompt(5)).toBe(true);
        expect(shouldShowSupportPrompt(6)).toBe(true);
    });

    it('respects a custom first-threshold env value', () => {
        vi.stubEnv('NEXT_PUBLIC_SUPPORT_PROMPT_FIRST_THRESHOLD', '3');
        expect(shouldShowSupportPrompt(2)).toBe(false);
        expect(shouldShowSupportPrompt(3)).toBe(true);
    });

    it('falls back to the default when the env value is invalid', () => {
        vi.stubEnv('NEXT_PUBLIC_SUPPORT_PROMPT_FIRST_THRESHOLD', 'not-a-number');
        expect(shouldShowSupportPrompt(4)).toBe(false);
        expect(shouldShowSupportPrompt(5)).toBe(true);
    });
});

describe('dismissSupportPrompt', () => {
    it('pushes the next eligible count out by the default cooldown', () => {
        vi.stubEnv('NEXT_PUBLIC_SUPPORT_PROMPT_COOLDOWN', '10');
        dismissSupportPrompt(5);
        expect(shouldShowSupportPrompt(14)).toBe(false);
        expect(shouldShowSupportPrompt(15)).toBe(true);
    });

    it('respects a custom cooldown env value', () => {
        vi.stubEnv('NEXT_PUBLIC_SUPPORT_PROMPT_COOLDOWN', '2');
        dismissSupportPrompt(5);
        expect(shouldShowSupportPrompt(6)).toBe(false);
        expect(shouldShowSupportPrompt(7)).toBe(true);
    });

    it('falls back to the default cooldown when the env value is invalid', () => {
        vi.stubEnv('NEXT_PUBLIC_SUPPORT_PROMPT_COOLDOWN', '-1');
        dismissSupportPrompt(5);
        expect(shouldShowSupportPrompt(14)).toBe(false);
        expect(shouldShowSupportPrompt(15)).toBe(true);
    });
});
