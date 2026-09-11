'use client';

import {
    Stack,
    Chip,
    Box,
    Typography,
    LinearProgress,
} from '@mui/material';
import { getAppropriatenessDisplay } from '@/util/displayHelpers';
import type { VerdictKey } from '@/util/displayHelpers';

interface ThemePercentage {
    theme: string;
    percentage: number;
}

interface ThemeBreakdownProps {
    themes: string[];
    themePercentages?: ThemePercentage[];
    /** The song's overall appropriateness level — bars are colored to match its verdict. */
    appropriate?: number;
}

const verdictToBarColor: Record<VerdictKey, 'success' | 'warning' | 'error' | 'primary'> = {
    safe: 'success',
    caution: 'warning',
    blocked: 'error',
    unknown: 'primary',
};

export function ThemeBreakdown({ themes, themePercentages, appropriate = 0 }: ThemeBreakdownProps) {
    if (!themes || themes.length === 0) {
        return null;
    }

    const percentageByTheme = new Map(
        (themePercentages ?? []).map((tp) => [tp.theme.toLowerCase(), tp.percentage])
    );

    if (percentageByTheme.size === 0) {
        // Legacy/cached results with no percentage data — plain theme chips.
        return (
            <Stack direction="row" flexWrap="wrap" gap={1}>
                {themes.map((t) => (
                    <Chip key={t} label={t.replace(/_/g, ' ')} size="small" sx={{ textTransform: 'capitalize' }} />
                ))}
            </Stack>
        );
    }

    // Scale bars relative to the highest theme percentage in this song, so the most
    // prevalent theme always renders as a full bar rather than sitting at its raw value.
    const maxPercentage = Math.max(0, ...Array.from(percentageByTheme.values()));
    const barColor = verdictToBarColor[getAppropriatenessDisplay(appropriate).verdictKey];

    // Highest percentage first; themes with no percentage data sort last.
    const sortedThemes = [...themes].sort((a, b) => {
        const pa = percentageByTheme.get(a.toLowerCase());
        const pb = percentageByTheme.get(b.toLowerCase());
        if (pa === undefined && pb === undefined) return 0;
        if (pa === undefined) return 1;
        if (pb === undefined) return -1;
        return pb - pa;
    });

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 4, rowGap: 2 }}>
            {sortedThemes.map((t) => {
                const percentage = percentageByTheme.get(t.toLowerCase());
                const label = t.replace(/_/g, ' ');

                if (percentage === undefined) {
                    return (
                        <Chip key={t} label={label} size="small" sx={{ textTransform: 'capitalize', alignSelf: 'start' }} />
                    );
                }

                const relativeValue = maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0;

                return (
                    <Box key={t}>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize', mb: 0.5 }}>
                            {label}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={relativeValue}
                            color={barColor}
                            aria-label={`${label}: ${percentage}%`}
                        />
                    </Box>
                );
            })}
        </Box>
    );
}
