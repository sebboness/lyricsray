'use client';

import { useMemo, useState } from 'react';
import NextLink from 'next/link';
import {
    Box,
    Button,
    Chip,
    List,
    Paper,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import moment from 'moment';
import { EyebrowLabel } from './EyebrowLabel';
import { SongListRow, SongListRowItem } from './SongListRow';
import { getAppropriatenessDisplay } from '@/util/displayHelpers';
import type { VerdictKey } from '@/util/displayHelpers';

interface RecentSearchesClientProps {
    songs: SongListRowItem[];
    prevHref?: string;
    nextHref?: string;
}

type VerdictFilter = 'all' | VerdictKey;

const verdictFilters: { value: VerdictFilter; label: string }[] = [
    { value: 'all', label: 'Everyone' },
    { value: 'safe', label: 'Safe' },
    { value: 'caution', label: 'Listen first' },
    { value: 'blocked', label: 'Not for kids' },
];

/** "Today" / "Yesterday" / a formatted date, for grouping this page's results. */
function getDateGroupLabel(dateStr: string): string {
    const date = moment(dateStr).startOf('day');
    const diffDays = moment().startOf('day').diff(date, 'days');
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.format('MMM D, YYYY');
}

export function RecentSearchesClient({ songs, prevHref, nextHref }: RecentSearchesClientProps) {
    const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');
    const [themeFilter, setThemeFilter] = useState<string | null>(null);

    const availableThemes = useMemo(() => {
        const set = new Set<string>();
        songs.forEach((s) => s.themes.forEach((t) => set.add(t)));
        return Array.from(set).sort();
    }, [songs]);

    const filteredSongs = useMemo(
        () =>
            songs.filter((song) => {
                if (verdictFilter !== 'all' && getAppropriatenessDisplay(song.appropriate).verdictKey !== verdictFilter) {
                    return false;
                }
                if (themeFilter && !song.themes.includes(themeFilter)) {
                    return false;
                }
                return true;
            }),
        [songs, verdictFilter, themeFilter]
    );

    if (songs.length === 0) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No songs analyzed yet.</Typography>
            </Paper>
        );
    }

    // Group by day for the "Today / Yesterday / ..." section headers.
    const groups: { label: string; songs: SongListRowItem[] }[] = [];
    for (const song of filteredSongs) {
        const label = getDateGroupLabel(song.date);
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.label === label) {
            lastGroup.songs.push(song);
        } else {
            groups.push({ label, songs: [song] });
        }
    }

    return (
        <Box>
            <Paper sx={{ p: 3, mb: 3 }}>
                <EyebrowLabel sx={{ display: 'block', mb: 1.5 }}>Filter this page</EyebrowLabel>

                <ToggleButtonGroup
                    exclusive
                    value={verdictFilter}
                    onChange={(_, value) => value && setVerdictFilter(value)}
                    sx={{ mb: availableThemes.length > 0 ? 2 : 0, flexWrap: 'wrap' }}
                >
                    {verdictFilters.map((f) => (
                        <ToggleButton key={f.value} value={f.value}>
                            {f.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                {availableThemes.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                        {availableThemes.map((t) => (
                            <Chip
                                key={t}
                                label={t.replace(/_/g, ' ')}
                                size="small"
                                variant={themeFilter === t ? 'filled' : 'outlined'}
                                color={themeFilter === t ? 'primary' : 'default'}
                                onClick={() => setThemeFilter(themeFilter === t ? null : t)}
                                sx={{ textTransform: 'capitalize' }}
                            />
                        ))}
                    </Stack>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                    Showing {filteredSongs.length} of {songs.length} on this page
                    {(verdictFilter !== 'all' || themeFilter) && ' · filters apply to this page only'}
                </Typography>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
                {filteredSongs.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No songs on this page match those filters.
                    </Typography>
                ) : (
                    groups.map((group) => (
                        <Box key={group.label} sx={{ mb: 2, '&:last-of-type': { mb: 0 } }}>
                            <EyebrowLabel sx={{ display: 'block', mb: 0.5 }}>{group.label}</EyebrowLabel>
                            <List disablePadding>
                                {group.songs.map((song, index) => (
                                    <SongListRow
                                        key={song.songKey}
                                        song={song}
                                        showDate
                                        isLastRow={index === group.songs.length - 1}
                                    />
                                ))}
                            </List>
                        </Box>
                    ))
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
        </Box>
    );
}
