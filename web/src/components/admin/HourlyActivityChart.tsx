'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Typography, Box, useTheme } from '@mui/material';
import { DailyStat } from '@/storage/DailyStatsStorage';

interface HourlyActivityChartProps {
    recentStats: DailyStat[]; // sorted newest first; uses [0] and [1]
}

function buildSlots(recentStats: DailyStat[]) {
    // Oldest day first so the 48-slot array runs chronologically
    const days = [...recentStats].reverse();
    const slots: { label: string; 'Page views': number; Analyses: number }[] = [];

    for (const day of days) {
        const breakdown = day.hourlyBreakdown
            ?? Array.from({ length: 24 }, () => ({ pageViews: 0, analyses: 0 }));

        breakdown.forEach((bucket, utcHour) => {
            const dt = new Date(`${day.date}T${String(utcHour).padStart(2, '0')}:00:00Z`);
            const mm = String(dt.getMonth() + 1).padStart(2, '0');
            const dd = String(dt.getDate()).padStart(2, '0');
            const hh = String(dt.getHours()).padStart(2, '0');
            slots.push({
                label: `${mm}-${dd} ${hh}:00`,
                'Page views': bucket.pageViews,
                Analyses: bucket.analyses,
            });
        });
    }

    return slots;
}

export function HourlyActivityChart({ recentStats }: HourlyActivityChartProps) {
    const theme = useTheme();

    if (recentStats.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">No hourly data yet.</Typography>
            </Box>
        );
    }

    const slots = buildSlots(recentStats);
    const hasData = slots.some((s) => s['Page views'] + s.Analyses > 0);

    if (!hasData) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">No hourly data yet.</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Hourly activity — last 48 hours (local time)
            </Typography>
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={slots} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="10%">
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={theme.palette.divider}
                        vertical={false}
                    />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                        tickLine={false}
                        axisLine={false}
                        interval={5}
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
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="square" />
                    <Bar dataKey="Page views" stackId="a" fill="#3B82F6" radius={[0, 0, 3, 3]} />
                    <Bar dataKey="Analyses" stackId="a" fill="#10B981" radius={[3, 3, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
}
