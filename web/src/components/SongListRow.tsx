'use client';

import NextLink from 'next/link';
import { Typography, ListItem, ListItemButton, Box } from '@mui/material';
import moment from 'moment';
import { AgeBadge } from './AgeBadge';
import { getAppropriatenessDisplay, getShortAgeDisplay } from '@/util/displayHelpers';
import { encodeSongKeyForPath } from '@/util/routeHelper';

export interface SongListRowItem {
    songKey: string;
    songName: string;
    artistName: string;
    recommendedAge: number;
    themes: string[];
    appropriate: number;
    date: string;
    /** Not shown in this row — used for SEO/social-share images on the artist page. */
    thumbnailUrl?: string;
}

interface SongListRowProps {
    song: SongListRowItem;
    /** Show a relative "2h ago" timestamp on wider screens. */
    showDate?: boolean;
    isLastRow?: boolean;
}

export function SongListRow({ song, showDate = false, isLastRow = false }: SongListRowProps) {
    const display = getAppropriatenessDisplay(song.appropriate);
    const themeSummary = song.themes.slice(0, 3).map((t) => t.replace(/_/g, ' ')).join(', ');

    return (
        <ListItem
            disablePadding
            sx={{
                borderBottom: isLastRow ? 'none' : '1px solid',
                borderColor: 'divider',
            }}
        >
            <ListItemButton
                component={NextLink}
                href={`/analysis/${encodeSongKeyForPath(song.songKey)}`}
                sx={{ py: 1.5, px: 1, display: 'flex', alignItems: 'center', gap: 2 }}
            >
                <AgeBadge verdictKey={display.verdictKey} size="small">
                    {getShortAgeDisplay(song.recommendedAge)}
                </AgeBadge>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {song.songName}
                        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                            {' '}· {song.artistName}
                        </Box>
                    </Typography>
                    {themeSummary && (
                        <Typography noWrap variant="body2" color="text.secondary">
                            {themeSummary}
                        </Typography>
                    )}
                </Box>

                {showDate && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}
                    >
                        {moment(song.date).fromNow()}
                    </Typography>
                )}
            </ListItemButton>
        </ListItem>
    );
}
