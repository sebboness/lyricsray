'use client';

import NextLink from 'next/link';
import {
    Box,
    Link as MuiLink,
    List,
    ListItem,
    ListItemButton,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { AgeBadge } from './AgeBadge';
import { EyebrowLabel } from './EyebrowLabel';
import { SongListRowItem } from './SongListRow';
import { getAppropriatenessDisplay, getShortAgeDisplay } from '@/util/displayHelpers';
import { encodeSongKeyForPath } from '@/util/routeHelper';

interface WhatKidsArePlayingProps {
    songs: SongListRowItem[];
}

/** Compact "What kids are playing" list shown alongside the analyze form on the home page. */
export function WhatKidsArePlaying({ songs }: WhatKidsArePlayingProps) {
    if (songs.length === 0) {
        return null;
    }

    return (
        <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <EyebrowLabel>What kids are playing</EyebrowLabel>
                <MuiLink component={NextLink} href="/recent-searches" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    All
                </MuiLink>
            </Stack>

            <List disablePadding>
                {songs.map((song, index) => {
                    const display = getAppropriatenessDisplay(song.appropriate);

                    return (
                        <ListItem
                            key={song.songKey}
                            disablePadding
                            sx={{
                                borderBottom: index < songs.length - 1 ? '1px solid' : 'none',
                                borderColor: 'divider',
                            }}
                        >
                            <ListItemButton
                                component={NextLink}
                                href={`/analysis/${encodeSongKeyForPath(song.songKey)}`}
                                sx={{
                                    px: 0,
                                    py: 1.5,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 2,
                                }}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                                        {song.songName}
                                    </Typography>
                                    <Typography noWrap variant="body2" color="text.secondary">
                                        {song.artistName}
                                    </Typography>
                                </Box>
                                <AgeBadge verdictKey={display.verdictKey} size="small">
                                    {getShortAgeDisplay(song.recommendedAge)}
                                </AgeBadge>
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Paper>
    );
}
