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

export function ThemeBreakdown({ themes, themePercentages }: ThemeBreakdownProps) {
    if (!themes || themes.length === 0) {
        return null;
    }

    const percentageByTheme = new Map(
        (themePercentages ?? []).map((tp) => [tp.theme.toLowerCase(), tp.percentage])
    );

    // Scale bars relative to the highest theme percentage in this song, so the most
    // prevalent theme always renders as a full bar rather than sitting at its raw value.
    const maxPercentage = Math.max(0, ...Array.from(percentageByTheme.values()));

    return (
        <Stack spacing={1}>
            {themes.map((t) => {
                const percentage = percentageByTheme.get(t.toLowerCase());
                const label = t.replace(/_/g, ' ');

                if (percentage === undefined) {
                    return (
                        <Box key={t}>
                            <Chip label={label} size="small" sx={{ height: 24 }} />
                        </Box>
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
                            aria-label={`${label}: ${percentage}%`}
                            sx={{ height: 6, borderRadius: 3 }}
                        />
                    </Box>
                );
            })}
        </Stack>
    );
}
