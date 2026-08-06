'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Typography, Box, useTheme } from '@mui/material';
import { DailyStat } from '@/storage/DailyStatsStorage';

interface AnalysisChartProps {
    stats: DailyStat[];
}

export function AnalysisChart({ stats }: AnalysisChartProps) {
    const theme = useTheme();

    // Show last 30 days oldest-first for left-to-right timeline
    const data = [...stats].reverse().map((s) => ({
        date: s.date.slice(5), // MM-DD
        'From cache': s.cacheHits,
        'New analysis': s.cacheMisses,
    }));

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
                Analyses per day (last 30 days)
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={theme.palette.divider}
                        vertical={false}
                    />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 4,
                            fontSize: 12,
                        }}
                        cursor={{ fill: theme.palette.action.hover }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        iconType="square"
                    />
                    <Bar dataKey="From cache" stackId="a" fill="#10B981" radius={[0, 0, 3, 3]} />
                    <Bar dataKey="New analysis" stackId="a" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
}
