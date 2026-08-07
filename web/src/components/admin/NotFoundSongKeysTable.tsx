'use client';

import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Box, Paper,
} from '@mui/material';
import { DailyStat } from '@/storage/DailyStatsStorage';

interface NotFoundSongKeysTableProps {
    stats: DailyStat[];
}

export function NotFoundSongKeysTable({ stats }: NotFoundSongKeysTableProps) {
    const countMap = new Map<string, number>();
    for (const s of stats) {
        for (const entry of s.notFoundSongKeys ?? []) {
            countMap.set(entry.songKey, (countMap.get(entry.songKey) ?? 0) + entry.count);
        }
    }

    const rows = Array.from(countMap.entries())
        .map(([songKey, count]) => ({ songKey, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

    if (rows.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">No 404s recorded.</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Not found song keys (30 days)
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 280, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Song key</TableCell>
                            <TableCell align="right">404 count</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(({ songKey, count }) => (
                            <TableRow key={songKey} hover>
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                                    {songKey}
                                </TableCell>
                                <TableCell align="right">{count}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
