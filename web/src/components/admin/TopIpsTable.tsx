'use client';

import { useState } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Box, Chip, Paper, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { DailyStat, TopIp } from '@/storage/DailyStatsStorage';

type UaFilter = 'all' | 'person';

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

function mergeIps(stats: DailyStat[], filter: UaFilter): TopIp[] {
    const merged = new Map<string, TopIp>();
    for (const s of stats.slice(0, 2)) {
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
    const all = Array.from(merged.values());
    if (filter === 'person') {
        return all
            .filter((ip) => ip.uaBreakdown.person > 0)
            .sort((a, b) => b.uaBreakdown.person - a.uaBreakdown.person)
            .slice(0, 20);
    }
    return all.sort((a, b) => b.eventCount - a.eventCount).slice(0, 20);
}

export function TopIpsTable({ stats }: TopIpsTableProps) {
    const [uaFilter, setUaFilter] = useState<UaFilter>('all');

    const rows = mergeIps(stats, uaFilter);

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                    Top IPs by activity (last 2 days)
                </Typography>
                <ToggleButtonGroup
                    value={uaFilter}
                    exclusive
                    onChange={(_, val) => { if (val) setUaFilter(val); }}
                    size="small"
                >
                    <ToggleButton value="all">All</ToggleButton>
                    <ToggleButton value="person">Persons only</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {rows.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                    No IP data recorded{uaFilter === 'person' ? ' for persons' : ''}.
                </Typography>
            ) : (
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
            )}
        </Box>
    );
}
