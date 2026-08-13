'use client';

import { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Typography, Box, useTheme } from '@mui/material';
import { DailyStat } from '@/storage/DailyStatsStorage';
import { utcDateToLocalMonthDay } from '@/util/dateFormat';

interface AnalysisChartProps {
    stats: DailyStat[];
    days: number;
}

export function AnalysisChart({ stats, days }: AnalysisChartProps) {
    const theme = useTheme();
    const [hidden, setHidden] = useState<Set<string>>(new Set());
    const toggleSeries = (entry: { value: string }) => setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(entry.value)) next.delete(entry.value); else next.add(entry.value);
        return next;
    });

    const data = [...stats].reverse().map((s) => ({
        date: utcDateToLocalMonthDay(s.date),
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
                Analyses per day (last {days} days)
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
                        wrapperStyle={{ fontSize: 12, paddingTop: 8, cursor: 'pointer' }}
                        iconType="square"
                        onClick={toggleSeries}
                        formatter={(value) => (
                            <span style={{ opacity: hidden.has(value) ? 0.4 : 1, userSelect: 'none' }}>{value}</span>
                        )}
                    />
                    <Bar dataKey="From cache" hide={hidden.has('From cache')} stackId="a" fill="#10B981" radius={[0, 0, 3, 3]} />
                    <Bar dataKey="New analysis" hide={hidden.has('New analysis')} stackId="a" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
}
