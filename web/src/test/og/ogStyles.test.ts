import { describe, it, expect } from 'vitest';
import { OG_COLORS, getOgVerdictTokens } from '@/og/ogStyles';

describe('getOgVerdictTokens', () => {
    it('returns the verdict palette for each known key', () => {
        expect(getOgVerdictTokens('safe').color).toBe(OG_COLORS.verdict.safe.main);
        expect(getOgVerdictTokens('caution').border).toBe(OG_COLORS.verdict.caution.border);
        expect(getOgVerdictTokens('blocked').surface).toBe(OG_COLORS.verdict.blocked.surface);
    });

    it('returns neutral tokens for unknown or unexpected keys', () => {
        expect(getOgVerdictTokens('unknown').color).toBe(OG_COLORS.unknown);
        expect(getOgVerdictTokens('constructor').color).toBe(OG_COLORS.unknown);
        expect(getOgVerdictTokens('').color).toBe(OG_COLORS.unknown);
    });
});
