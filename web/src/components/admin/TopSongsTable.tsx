'use client';

import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Box, Paper,
} from '@mui/material';
import { DailyStat, TopSong } from '@/storage/DailyStatsStorage';

interface TopSongsTableProps {
    stats: DailyStat[];
}

export function TopSongsTable({ stats }: TopSongsTableProps) {
    // Aggregate top songs across all days
    const songMap = new Map<string, TopSong>();
    for (const s of stats) {
        for (const song of s.topSongs ?? []) {
            const existing = songMap.get(song.songKey);
            if (existing) {
                existing.analysisCount += song.analysisCount;
                existing.pageViewCount += song.pageViewCount;
            } else {
                songMap.set(song.songKey, { ...song });
            }
        }
    }

    const songs = Array.from(songMap.values())
        .sort((a, b) => (b.analysisCount + b.pageViewCount) - (a.analysisCount + a.pageViewCount))
        .slice(0, 10);

    if (songs.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">No data yet.</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Top songs (30 days)
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Artist</TableCell>
                            <TableCell>Song</TableCell>
                            <TableCell align="right">Analyses</TableCell>
                            <TableCell align="right">Page views</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {songs.map((song) => (
                            <TableRow key={song.songKey} hover>
                                <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {song.artistName || '—'}
                                </TableCell>
                                <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {song.songName || '—'}
                                </TableCell>
                                <TableCell align="right">{song.analysisCount}</TableCell>
                                <TableCell align="right">{song.pageViewCount}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
