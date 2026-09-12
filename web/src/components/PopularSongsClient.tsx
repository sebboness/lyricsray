'use client';

import NextLink from 'next/link';
import {
    Typography,
    Paper,
    List,
    Box,
    Button,
} from '@mui/material';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { SongListRow, SongListRowItem } from './SongListRow';

interface PopularSongsClientProps {
    title?: string;
    showTitle?: boolean;
    songs: SongListRowItem[];
    actionLabel?: string;
    actionHref?: string;
}

export function PopularSongsClient({
    title = "Popular",
    showTitle = true,
    songs,
    actionLabel = "More recent songs",
    actionHref = "/recent-searches",
}: PopularSongsClientProps) {
    if (songs.length === 0) {
        return null;
    }

    return (
        <Paper sx={{ p: 3 }}>
            {showTitle && (
                <Typography variant="h5" fontWeight="600" mb={2}>
                    {title}
                </Typography>
            )}

            <List sx={{ py: 0 }}>
                {songs.map((song, index) => (
                    <SongListRow
                        key={song.songKey}
                        song={song}
                        isLastRow={index === songs.length - 1}
                    />
                ))}
            </List>

            <Box sx={{ textAlign: 'right', mt: 2 }}>
                <Button
                    component={NextLink}
                    href={actionHref}
                    variant="outlined"
                    endIcon={<ArrowForward />}
                >
                    {actionLabel}
                </Button>
            </Box>
        </Paper>
    );
}
