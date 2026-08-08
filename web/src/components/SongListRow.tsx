'use client';

import NextLink from 'next/link';
import { Typography, ListItem, ListItemButton, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import moment from 'moment';
import { LyricsThemes } from './LyricsThemes';
import { getRecommendedAgeDisplay, getAppropriatenessDisplay } from '@/util/displayHelpers';
import { encodeSongKeyForPath } from '@/util/routeHelper';

export interface SongListRowItem {
    songKey: string;
    songName: string;
    artistName: string;
    recommendedAge: number;
    themes: string[];
    appropriate: number;
    date: string;
}

interface SongListRowProps {
    song: SongListRowItem;
    index: number;
    total: number;
    showDate?: boolean;
}

export function SongListRow({ song, index, total, showDate = false }: SongListRowProps) {
    const theme = useTheme();
    const display = getAppropriatenessDisplay(song.appropriate, theme);

    return (
        <ListItem
            sx={{
                px: 0,
                py: 0,
                borderBottom: index < total - 1 ? '1px solid' : 'none',
                borderColor: 'rgba(255, 0, 255, 0.1)',
                '&:hover': {
                    backgroundColor: 'rgba(255, 0, 255, 0.05)',
                    borderRadius: 1,
                },
            }}
        >
            <ListItemButton
                component={NextLink}
                href={`/analysis/${encodeSongKeyForPath(song.songKey)}`}
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
                        <Typography fontWeight={500} sx={{ fontSize: { xs: '0.8em', sm: '1em' } }}>
                            <strong>{song.songName}</strong> &nbsp;
                            <Box component="span" sx={{ fontSize: '0.9em', fontStyle: 'italic' }}>by {song.artistName}</Box>
                        </Typography>

                        {/* Right side (date + age) */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flexShrink: 0,
                            }}
                        >
                            {showDate && (
                                <Typography
                                    sx={{
                                        display: { xs: 'none', sm: 'block' },
                                        color: 'text.secondary',
                                        fontSize: '0.9em',
                                    }}
                                >
                                    {moment(song.date).format('MMM D, YYYY')}
                                </Typography>
                            )}

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
                                <strong>{getRecommendedAgeDisplay(song.recommendedAge)}</strong>
                            </Typography>
                        </Box>
                    </Box>

                    {/* ROW 2: Theme tags */}
                    <LyricsThemes themes={song.themes} />

                </Box>
            </ListItemButton>
        </ListItem>
    );
}
