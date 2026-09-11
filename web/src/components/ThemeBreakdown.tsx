'use client';

import {
    Stack,
    Chip,
    Box,
    Typography,
    LinearProgress,
} from '@mui/material';

interface ThemePercentage {
    theme: string;
    percentage: number;
}

interface ThemeBreakdownProps {
    themes: string[];
    themePercentages?: ThemePercentage[];
}

/** Maps a theme's raw percentage to the same colors used for verdicts elsewhere. */
const getThemeSeverityColor = (percentage: number): 'success' | 'warning' | 'error' => {
    if (percentage >= 50) return 'error';
    if (percentage >= 20) return 'warning';
    return 'success';
};

export function ThemeBreakdown({ themes, themePercentages }: ThemeBreakdownProps) {
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

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 4, rowGap: 2 }}>
            {themes.map((t) => {
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
                            color={getThemeSeverityColor(percentage)}
                            aria-label={`${label}: ${percentage}%`}
                        />
                    </Box>
                );
            })}
        </Box>
    );
}
