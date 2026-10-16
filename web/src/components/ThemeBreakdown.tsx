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
import { buildThemeBars, hasThemePercentages, type ThemePercentage } from '@/util/themeBars';

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

    if (!hasThemePercentages(themePercentages)) {
        // Legacy/cached results with no percentage data — plain theme chips.
        return (
            <Stack direction="row" flexWrap="wrap" gap={1}>
                {themes.map((t) => (
                    <Chip key={t} label={t.replace(/_/g, ' ')} size="small" sx={{ textTransform: 'capitalize' }} />
                ))}
            </Stack>
        );
    }

    const barColor = verdictToBarColor[getAppropriatenessDisplay(appropriate).verdictKey];

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 4, rowGap: 2 }}>
            {buildThemeBars(themes, themePercentages).map(({ theme, label, percentage, relativeValue }) => {
                if (percentage === undefined) {
                    return (
                        <Chip key={theme} label={label} size="small" sx={{ textTransform: 'capitalize', alignSelf: 'start' }} />
                    );
                }

                return (
                    <Box key={theme}>
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
