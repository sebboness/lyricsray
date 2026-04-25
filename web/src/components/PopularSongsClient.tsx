'use client';

import NextLink from 'next/link';
import {
    Typography,
    Paper,
    List,
    ListItem,
    Box,
    ListItemButton,
} from '@mui/material';
import { CheckCircle, Warning, Error } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { PopularSongItem } from '@/lib/getPopularSongs';
import { LyricsThemes } from './LyricsThemes';
import { getRecommendedAgeDisplay } from '@/util/displayHelpers';

interface PopularSongsClientProps {
    title?: string;
    showTitle?: boolean;
    songs: PopularSongItem[];
}

/**
 * Gets the appropriate icon and color based on appropriateness level
 */
const getAppropriatenessDisplay = (appropriate: number, theme: any) => {
    switch (appropriate) {
        case 1:
            return {
                icon: <CheckCircle sx={{ color: 'success.main' }} />,
                color: theme.palette.success.main,
                label: 'Parent-friendly'
            };
        case 2:
            return {
                icon: <Warning sx={{ color: 'warning.main' }} />,
                color: theme.palette.warning.main,
                label: 'Use caution'
            };
        case 3:
            return {
                icon: <Error sx={{ color: 'error.main' }} />,
                color: theme.palette.error.main,
                label: 'For mature audiences'
            };
        default:
            return {
                icon: <Error sx={{ color: 'text.secondary' }} />,
                color: theme.palette.text.secondary,
                label: 'Unknown'
            };
    }
};

export function PopularSongsClient({
    title = "Popular",
    showTitle = true,
    songs
}: PopularSongsClientProps) {
    const theme = useTheme();

    if (songs.length === 0) {
        return null;
    }

    return (
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            {showTitle && (
                <Typography variant="h5" fontWeight="600" mb={2}>
                    {title}
                </Typography>
            )}

            <List sx={{ py: 0 }}>
                {songs.map((analysis, index) => {
                    const display = getAppropriatenessDisplay(analysis.appropriate, theme);

                    return (
                        <ListItem
                            key={analysis.songKey}
                            sx={{
                                px: 0,
                                py: 0,
                                borderBottom: index < songs.length - 1 ? '1px solid' : 'none',
                                borderColor: 'rgba(255, 0, 255, 0.1)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 0, 255, 0.05)',
                                    borderRadius: 1,
                                },
                            }}
                        >
                            <ListItemButton
                                component={NextLink}
                                href={`/analysis/${analysis.songKey}`}
                                sx={{
                                    py: 1.5,
                                    px: 1.5,
                                    alignItems: 'flex-start',
                                    backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255, 0, 255, 0.1)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 0, 255, 0.05)',
                                    },
                                }}
                            >
                                <Box sx={{ width: '100%' }}>

                                    {/* ROW 1: Title + meta */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 1,
                                            mb: 1,
                                        }}
                                    >
                                        {/* Title */}
                                        <Typography fontWeight={500} sx={{fontSize: { xs: '0.8em', sm: '1em' }}}>
                                            <strong>{analysis.songName}</strong> &nbsp;
                                            <Box component="span" sx={{ fontSize: '0.9em', fontStyle: 'italic' }}>by {analysis.artistName}</Box>
                                        </Typography>

                                        {/* Right side (age + link) */}
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            {/* Age tag */}
                                            <Typography
                                                sx={{
                                                    backgroundColor: `${display.color}15`,
                                                    color: display.color,
                                                    fontSize: { xs: '0.8em', sm: '1em' },
                                                    px: 1,
                                                    py: 0.25,
                                                    borderRadius: 1,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                <strong>{getRecommendedAgeDisplay(analysis.recommendedAge)}</strong>
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* ROW 2: Theme tags */}
                                    <LyricsThemes themes={analysis.themes} />

                                </Box>
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Paper>
    );
}