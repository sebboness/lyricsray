'use client';

import NextLink from 'next/link';
import {
    Box,
    Button,
    Grid,
    List,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { EyebrowLabel } from './EyebrowLabel';
import { SongListRow, SongListRowItem } from './SongListRow';
import type { VerdictKey } from '@/util/displayHelpers';

interface RecentSearchesClientProps {
    songs: SongListRowItem[];
    prevHref?: string;
    nextHref?: string;
    /** The appropriateness level (1/2/3) the results are currently filtered to server-side, if any. */
    appropriate?: number;
}

// Maps each verdict to its numeric `appropriate` level, for building the filter links below.
const verdictAppropriateLevel: Record<VerdictKey, number> = {
    safe: 1,
    caution: 2,
    blocked: 3,
    unknown: 0,
};

const verdictFilters: { verdictKey: VerdictKey; label: string }[] = [
    { verdictKey: 'safe', label: 'Safe' },
    { verdictKey: 'caution', label: 'Listen first' },
    { verdictKey: 'blocked', label: 'Not for kids' },
];

export function RecentSearchesClient({ songs, prevHref, nextHref, appropriate }: RecentSearchesClientProps) {
    if (songs.length === 0 && appropriate === undefined) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No songs analyzed yet.</Typography>
            </Paper>
        );
    }

    return (
        <Grid container spacing={3}>
            {/* Filters */}
            <Grid size={{ xs: 12, sm: 3 }}>
                <Paper sx={{ p: 2.5 }}>
                    <EyebrowLabel sx={{ display: 'block', mb: 1 }}>Verdict</EyebrowLabel>
                    <Stack spacing={0.5}>
                        <FilterRow href="/recent-searches" label="All songs" selected={appropriate === undefined} />
                        {verdictFilters.map((f) => (
                            <FilterRow
                                key={f.verdictKey}
                                href={`/recent-searches?appropriate=${verdictAppropriateLevel[f.verdictKey]}`}
                                label={f.label}
                                selected={appropriate === verdictAppropriateLevel[f.verdictKey]}
                            />
                        ))}
                    </Stack>
                </Paper>
            </Grid>

            {/* Results */}
            <Grid size={{ xs: 12, sm: 9 }}>
                <Paper sx={{ p: 3, mb: 3 }}>
                    {songs.length === 0 ? (
                        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                            No songs match this filter.
                        </Typography>
                    ) : (
                        <List disablePadding>
                            {songs.map((song, index) => (
                                <SongListRow key={song.songKey} song={song} isLastRow={index === songs.length - 1} />
                            ))}
                        </List>
                    )}
                </Paper>

                {(prevHref || nextHref) && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                        <Button
                            component={NextLink}
                            href={prevHref ?? '#'}
                            variant="outlined"
                            startIcon={<ArrowBack />}
                            disabled={!prevHref}
                        >
                            Prev
                        </Button>
                        <Button
                            component={NextLink}
                            href={nextHref ?? '#'}
                            variant="outlined"
                            endIcon={<ArrowForward />}
                            disabled={!nextHref}
                        >
                            Next
                        </Button>
                    </Box>
                )}
            </Grid>
        </Grid>
    );
}

function FilterRow({ href, label, selected }: { href: string; label: string; selected: boolean }) {
    return (
        <Box
            component={NextLink}
            href={href}
            sx={{
                display: 'block',
                textDecoration: 'none',
                py: 0.75,
                px: 1,
                borderRadius: 1,
                backgroundColor: selected ? 'action.selected' : 'transparent',
                '&:hover': { backgroundColor: selected ? 'action.selected' : 'action.hover' },
            }}
        >
            <Typography
                variant="body2"
                sx={{ fontWeight: selected ? 600 : 400, color: selected ? 'text.primary' : 'text.secondary' }}
            >
                {label}
            </Typography>
        </Box>
    );
}
