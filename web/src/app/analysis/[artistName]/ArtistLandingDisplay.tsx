'use client';

import { useMemo, useState } from 'react';
import NextLink from 'next/link';
import { Box, Button, Container, Link, List, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { EyebrowLabel } from '@/components/EyebrowLabel';
import { SongListRow, SongListRowItem } from '@/components/SongListRow';
import { getShortAgeDisplay } from '@/util/displayHelpers';
import { buildAgeBuckets, buildArtistSummary } from '@/util/artistSummary';

interface ArtistLandingDisplayProps {
    artistName: string;
    songs: SongListRowItem[];
}

export function ArtistLandingDisplay({ artistName, songs }: ArtistLandingDisplayProps) {
    const [ageFilter, setAgeFilter] = useState<string | 'all'>('all');

    const ageBuckets = useMemo(() => buildAgeBuckets(songs), [songs]);
    const filteredSongs = ageFilter === 'all' ? songs : songs.filter((s) => getShortAgeDisplay(s.recommendedAge) === ageFilter);
    const totalCount = songs.length;

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 8 } }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <Link component={NextLink} href="/" color="inherit">Analyze</Link>
                {' / '}Artists{' / '}{artistName}
            </Typography>

            <Typography variant="h1" sx={{ fontSize: { xs: '2rem', sm: '2.75rem' }, mb: 1 }}>
                {artistName}
            </Typography>

            {totalCount > 0 ? (
                <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {totalCount} {totalCount === 1 ? 'song' : 'songs'} analyzed
                    </Typography>

                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography sx={{ mb: 2 }}>{buildArtistSummary(songs)}</Typography>

                        <EyebrowLabel sx={{ display: 'block', mb: 1 }}>Age spread</EyebrowLabel>

                        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
                            {ageBuckets.map((bucket) => (
                                <Box
                                    key={bucket.label}
                                    sx={{
                                        flex: bucket.count,
                                        height: 6,
                                        borderRadius: 3,
                                        backgroundColor: bucket.color,
                                    }}
                                />
                            ))}
                        </Box>

                        <Stack direction="row" flexWrap="wrap" gap={2}>
                            {ageBuckets.map((bucket) => (
                                <Stack key={bucket.label} direction="row" alignItems="center" gap={0.75}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: bucket.color }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {bucket.label === 'ALL' ? 'All ages' : bucket.label} · {bucket.count}
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Paper>

                    {ageBuckets.length > 1 && (
                        <ToggleButtonGroup
                            exclusive
                            value={ageFilter}
                            onChange={(_, value) => value && setAgeFilter(value)}
                            sx={{ mb: 3, flexWrap: 'wrap' }}
                        >
                            <ToggleButton value="all">All {totalCount}</ToggleButton>
                            {ageBuckets.map((bucket) => (
                                <ToggleButton key={bucket.label} value={bucket.label}>
                                    {bucket.label === 'ALL' ? 'All ages' : bucket.label}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    )}

                    <Paper sx={{ p: 3, mb: 3 }}>
                        <List disablePadding>
                            {filteredSongs.map((song, index) => (
                                <SongListRow
                                    key={song.songKey}
                                    song={song}
                                    showDate
                                    isLastRow={index === filteredSongs.length - 1}
                                />
                            ))}
                        </List>
                    </Paper>

                    <Box sx={{ textAlign: 'right' }}>
                        <Button component={NextLink} href="/" variant="outlined" startIcon={<HomeIcon />}>
                            Analyze a Song
                        </Button>
                    </Box>
                </>
            ) : (
                <>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        No analyses found for {artistName} yet. Be the first!
                    </Typography>
                    <Button component={NextLink} href="/" variant="outlined" startIcon={<HomeIcon />}>
                        Analyze a Song
                    </Button>
                </>
            )}
        </Container>
    );
}
