import { describe, it, expect } from 'vitest';
import { buildThemeBars, hasThemePercentages } from '@/util/themeBars';

describe('buildThemeBars', () => {
    it('sorts by percentage and scales relative to the top theme', () => {
        const bars = buildThemeBars(['drugs', 'violence'], [
            { theme: 'violence', percentage: 80 },
            { theme: 'drugs', percentage: 20 },
        ]);

        expect(bars.map((b) => b.theme)).toEqual(['violence', 'drugs']);
        expect(bars[0].relativeValue).toBe(100);
        expect(bars[1].relativeValue).toBe(25);
    });

    it('puts themes without percentage data last, with an empty bar', () => {
        const bars = buildThemeBars(['romance', 'violence'], [{ theme: 'violence', percentage: 50 }]);

        expect(bars.map((b) => b.theme)).toEqual(['violence', 'romance']);
        expect(bars[1].percentage).toBeUndefined();
        expect(bars[1].relativeValue).toBe(0);
    });

    it('does not divide by zero when every percentage is 0', () => {
        const [bar] = buildThemeBars(['violence'], [{ theme: 'violence', percentage: 0 }]);

        expect(bar.relativeValue).toBe(0);
    });

    it('matches case-insensitively and replaces underscores in labels', () => {
        const [bar] = buildThemeBars(['Sexual_Innuendo'], [{ theme: 'SEXUAL_INNUENDO', percentage: 40 }]);

        expect(bar.label).toBe('Sexual Innuendo');
        expect(bar.relativeValue).toBe(100);
    });

    it('returns an empty list when there are no themes', () => {
        expect(buildThemeBars([], undefined)).toEqual([]);
    });
});

describe('hasThemePercentages', () => {
    it('is false when absent or empty', () => {
        expect(hasThemePercentages(undefined)).toBe(false);
        expect(hasThemePercentages([])).toBe(false);
    });

    it('is true when at least one percentage exists', () => {
        expect(hasThemePercentages([{ theme: 'a', percentage: 1 }])).toBe(true);
    });
});
