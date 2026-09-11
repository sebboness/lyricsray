'use client';

import { useMemo, useState } from 'react';
import NextLink from 'next/link';
import { Box, Button, Container, Link, List, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { EyebrowLabel } from '@/components/EyebrowLabel';
import { SongListRow, SongListRowItem } from '@/components/SongListRow';
import { getAppropriatenessDisplay, getShortAgeDisplay } from '@/util/displayHelpers';

interface ArtistLandingDisplayProps {
    artistName: string;
    songs: SongListRowItem[];
}

interface AgeBucket {
    label: string;
    count: number;
    color: string;
}

/** Groups songs by their short age label, coloring each bucket by its most common verdict. */
function buildAgeBuckets(songs: SongListRowItem[]): AgeBucket[] {
    const byLabel = new Map<string, Map<number, number>>();

    for (const song of songs) {
        const label = getShortAgeDisplay(song.recommendedAge);
        if (!byLabel.has(label)) byLabel.set(label, new Map());
        const appropriateCounts = byLabel.get(label)!;
        appropriateCounts.set(song.appropriate, (appropriateCounts.get(song.appropriate) ?? 0) + 1);
    }

    const buckets: AgeBucket[] = Array.from(byLabel.entries()).map(([label, appropriateCounts]) => {
        const [mostCommonAppropriate] = Array.from(appropriateCounts.entries()).sort((a, b) => b[1] - a[1])[0];
        const count = Array.from(appropriateCounts.values()).reduce((sum, n) => sum + n, 0);
        const display = getAppropriatenessDisplay(mostCommonAppropriate);
        return { label, count, color: display.color };
    });

    return buckets.sort((a, b) => {
        if (a.label === 'ALL') return -1;
        if (b.label === 'ALL') return 1;
        return parseInt(a.label, 10) - parseInt(b.label, 10);
    });
}

/** A short, honest, data-derived summary — not a fabricated claim. */
function buildSummary(songs: SongListRowItem[]): string {
    const total = songs.length;
    const safeCount = songs.filter((s) => s.appropriate === 1).length;

    if (safeCount === total) return `All ${total} analyzed songs are safe for all ages.`;
    if (safeCount === 0) return `None of the ${total} analyzed songs are rated safe for all ages — worth a listen yourself first.`;
    return `${safeCount} of ${total} analyzed songs are safe for all ages; the rest are worth a listen first.`;
}

export function ArtistLandingDisplay({ artistName, songs }: ArtistLandingDisplayProps) {
    const [ageFilter, setAgeFilter] = useState<string | 'all'>('all');

    const ageBuckets = useMemo(() => buildAgeBuckets(songs), [songs]);
    const filteredSongs = ageFilter === 'all' ? songs : songs.filter((s) => getShortAgeDisplay(s.recommendedAge) === ageFilter);
    const totalCount = songs.length;

    return (
        <Container maxWidth="md" sx={{ py: { xs: 4, sm: 8 } }}>
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
                        <Typography sx={{ mb: 2 }}>{buildSummary(songs)}</Typography>

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
