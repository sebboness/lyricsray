'use client';

import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Box, Chip, Paper,
} from '@mui/material';
import { DailyStat, TopIp } from '@/storage/DailyStatsStorage';

interface TopIpsTableProps {
    stats: DailyStat[];
}

const UA_COLORS: Record<string, 'primary' | 'default' | 'success' | 'warning' | 'error'> = {
    person: 'primary',
    bot: 'default',
    searchEngine: 'success',
    aiCrawler: 'warning',
    unknown: 'error',
};

const UA_LABELS: Record<string, string> = {
    person: 'Person',
    bot: 'Bot',
    searchEngine: 'Search',
    aiCrawler: 'AI crawler',
    unknown: 'Unknown',
};

function mergeIps(stats: DailyStat[]): TopIp[] {
    const merged = new Map<string, TopIp>();
    for (const s of stats) {
        for (const ip of s.topIps ?? []) {
            const existing = merged.get(ip.hashedIp);
            if (!existing) {
                merged.set(ip.hashedIp, { ...ip, uaBreakdown: { ...ip.uaBreakdown } });
            } else {
                existing.eventCount += ip.eventCount;
                for (const key of Object.keys(ip.uaBreakdown) as (keyof TopIp['uaBreakdown'])[]) {
                    existing.uaBreakdown[key] += ip.uaBreakdown[key];
                }
            }
        }
    }
    return Array.from(merged.values())
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 20);
}

export function TopIpsTable({ stats }: TopIpsTableProps) {
    const rows = mergeIps(stats);

    if (rows.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">No IP data recorded.</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Top IPs by activity
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 340, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Hashed IP</TableCell>
                            <TableCell align="right">Events</TableCell>
                            <TableCell>UA breakdown</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(({ hashedIp, eventCount, uaBreakdown }) => {
                            const total = Object.values(uaBreakdown).reduce((s, n) => s + n, 0);
                            const chips = (Object.entries(uaBreakdown) as [keyof typeof uaBreakdown, number][])
                                .filter(([, n]) => n > 0)
                                .sort(([, a], [, b]) => b - a)
                                .map(([key, n]) => ({
                                    key,
                                    label: `${UA_LABELS[key]} ${Math.round((n / total) * 100)}%`,
                                    color: UA_COLORS[key],
                                }));

                            return (
                                <TableRow key={hashedIp} hover>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                        {hashedIp}
                                    </TableCell>
                                    <TableCell align="right">{eventCount}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {chips.map(({ key, label, color }) => (
                                                <Chip key={key} label={label} color={color} size="small" />
                                            ))}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
