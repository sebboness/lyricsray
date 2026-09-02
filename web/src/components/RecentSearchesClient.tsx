'use client';

import NextLink from 'next/link';
import { Paper, List, Box, Button } from '@mui/material';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { SongListRow, SongListRowItem } from './SongListRow';

interface RecentSearchesClientProps {
    songs: SongListRowItem[];
    nextCursor?: string;
}

export function RecentSearchesClient({ songs, nextCursor }: RecentSearchesClientProps) {
    if (songs.length === 0) {
        return null;
    }

    return (
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <List sx={{ py: 0 }}>
                {songs.map((song, index) => (
                    <SongListRow
                        key={song.songKey}
                        song={song}
                        index={index}
                        total={songs.length}
                        showDate
                    />
                ))}
            </List>

            {nextCursor && (
                <Box sx={{ textAlign: 'right', mt: 2 }}>
                    <Button
                        component={NextLink}
                        href={`/recent-searches?cursor=${encodeURIComponent(nextCursor)}`}
                        variant="contained"
                        endIcon={<ArrowForward />}
                    >
                        More
                    </Button>
                </Box>
            )}
        </Paper>
    );
}
