'use client';

import NextLink from 'next/link';
import { Box, Button, Container, List, Paper, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { SongListRow, SongListRowItem } from '@/components/SongListRow';

interface ArtistLandingDisplayProps {
    artistName: string;
    songs: SongListRowItem[];
}

export function ArtistLandingDisplay({ artistName, songs }: ArtistLandingDisplayProps) {
    return (
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 10, py: 8 }}>
            <Paper
                elevation={3}
                sx={{ p: 3, mb: 3, borderRadius: 3, textAlign: 'center' }}
            >
                <Typography variant="h1" sx={{ mb: 0, fontSize: { xs: '2.5rem', md: '3rem' } }}>
                    {artistName}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                    {songs.length > 0
                        ? `Our ${songs.length} analyzed ${songs.length === 1 ? 'song' : 'songs'} for this artist`
                        : `No analyses found for ${artistName} yet. Be the first!`}
                </Typography>
            </Paper>

            {songs.length > 0 ? (
                <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
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

                    <Box sx={{ textAlign: 'right', mt: 3 }}>
                        <Button component={NextLink} href="/" variant="contained" startIcon={<HomeIcon />}>
                            Analyze a Song
                        </Button>
                    </Box>
                </Paper>
            ) : (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Button component={NextLink} href="/" variant="contained" startIcon={<HomeIcon />}>
                        Analyze a Song
                    </Button>
                </Box>
            )}
        </Container>
    );
}
