export interface ThemePercentage {
    theme: string;
    percentage: number;
}

export interface ThemeBar {
    theme: string;
    label: string;
    percentage?: number;
    /** 0-100, relative to the highest percentage so the top theme is always a full bar. */
    relativeValue: number;
}

/** True when at least one theme has percentage data (otherwise callers fall back to plain chips). */
export function hasThemePercentages(themePercentages?: ThemePercentage[]): boolean {
    return (themePercentages ?? []).length > 0;
}

/** Sorts themes by prevalence (themes without data last) and scales each bar relative to the top theme. */
export function buildThemeBars(themes: string[], themePercentages?: ThemePercentage[]): ThemeBar[] {
    const percentageByTheme = new Map((themePercentages ?? []).map((tp) => [tp.theme.toLowerCase(), tp.percentage]));
    const maxPercentage = Math.max(0, ...Array.from(percentageByTheme.values()));

    return [...(themes ?? [])]
        .sort((a, b) => {
            const pa = percentageByTheme.get(a.toLowerCase());
            const pb = percentageByTheme.get(b.toLowerCase());
            if (pa === undefined && pb === undefined) return 0;
            if (pa === undefined) return 1;
            if (pb === undefined) return -1;
            return pb - pa;
        })
        .map((theme) => {
            const percentage = percentageByTheme.get(theme.toLowerCase());
            return {
                theme,
                label: theme.replace(/_/g, ' '),
                percentage,
                relativeValue: percentage !== undefined && maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0,
            };
        });
}
