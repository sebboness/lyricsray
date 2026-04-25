'use client';

import {
    Stack,
    Chip,
    Box,
} from '@mui/material';

interface PopularSongsClientProps {
    maxItems?: number;
    themes: string[];
}

export function LyricsThemes({
    maxItems,
    themes,
}: PopularSongsClientProps) {
    if (!themes || themes.length === 0) {
        return null;
    }

    const displayThemes = maxItems
        ? themes.slice(0, maxItems)
        : themes;

    return (
        <Box
            sx={{
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <Stack
                direction="row"
                sx={{
                    flexWrap: { xs: 'nowrap', sm: 'wrap' },
                    gap: 1,
                    overflowX: { xs: 'auto', sm: 'visible' },
                    overflowY: 'hidden',
                    scrollbarWidth: 'none', '&::-webkit-scrollbar': {
                        display: 'none',
                    },
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {displayThemes.map((t: string) => (
                    <Chip
                        key={t}
                        label={t.replace(/_/g, " ")}
                        size="small"
                        sx={{
                            height: 24,
                            mt: 0,
                            flexShrink: 0,
                        }}
                    />
                ))}
            </Stack>

            {/* Fade overlay */}
            <Box
                sx={{
                    display: { xs: 'inherit', sm: 'none' },
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 36,
                    pointerEvents: 'none',
                    background: (theme) =>
                        `linear-gradient(to right, transparent, ${theme.palette.background.paper})`,
                }}
            />
        </Box>
    );
}
