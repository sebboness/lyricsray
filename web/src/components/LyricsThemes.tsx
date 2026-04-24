'use client';

import {
    Stack,
    Chip,
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
        <Stack
            direction="row"
            spacing={1}
            sx={{
                mt: 1,
                flexWrap: 'wrap',
            }}
        >
            {displayThemes.map((theme: string) => (
                <Chip
                    key={theme}
                    label={theme.replace(/_/g, " ")}
                    size="small"
                    sx={{
                        height: 24,
                        mt: 2,
                    }}
                />
            ))}
        </Stack>
    );
}