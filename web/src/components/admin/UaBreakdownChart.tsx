'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Typography, Box, useTheme } from '@mui/material';
import { DailyStat } from '@/storage/DailyStatsStorage';

interface UaBreakdownChartProps {
    stats: DailyStat[];
}

const UA_COLORS: Record<string, string> = {
    person: '#3B82F6',
    searchEngine: '#10B981',
    aiCrawler: '#F59E0B',
    bot: '#6B7280',
};

const UA_LABELS: Record<string, string> = {
    person: 'Person',
    searchEngine: 'Search engine',
    aiCrawler: 'AI crawler',
    bot: 'Bot',
};

export function UaBreakdownChart({ stats }: UaBreakdownChartProps) {
    const theme = useTheme();

    // Aggregate UA breakdown across all days
    const totals: Record<string, number> = { person: 0, searchEngine: 0, aiCrawler: 0, bot: 0 };
    for (const s of stats) {
        if (s.uaBreakdown) {
            for (const key of Object.keys(totals)) {
                totals[key] += (s.uaBreakdown as unknown as Record<string, number>)[key] ?? 0;
            }
        }
    }

    const data = Object.entries(totals)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({ name: UA_LABELS[key] ?? key, value, key }));

    if (data.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">No data yet.</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Visitor type breakdown (30 days)
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="45%"
                        outerRadius={90}
                        dataKey="value"
                        strokeWidth={2}
                        stroke={theme.palette.background.paper}
                    >
                        {data.map((entry) => (
                            <Cell key={entry.key} fill={UA_COLORS[entry.key] ?? '#9CA3AF'} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 4,
                            fontSize: 12,
                        }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: 12 }}
                        iconType="square"
                    />
                </PieChart>
            </ResponsiveContainer>
        </Box>
    );
}
