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
import { PopularSongItem } from '@/lib/getPopularSongs';
import { SongListRow } from './SongListRow';

interface PopularSongsClientProps {
    title?: string;
    showTitle?: boolean;
    songs: PopularSongItem[];
}

export function PopularSongsClient({
    title = "Popular",
    showTitle = true,
    songs
}: PopularSongsClientProps) {
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
                {songs.map((song, index) => (
                    <SongListRow
                        key={song.songKey}
                        song={song}
                        index={index}
                        total={songs.length}
                    />
                ))}
            </List>

            <Box sx={{ textAlign: 'right', mt: 2 }}>
                <Button
                    component={NextLink}
                    href="/recent-searches"
                    variant="contained"
                    endIcon={<ArrowForward />}
                >
                    More recent songs
                </Button>
            </Box>
        </Paper>
    );
}
