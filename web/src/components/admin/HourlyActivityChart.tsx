'use client';

import { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Typography, Box, useTheme } from '@mui/material';
import { DailyStat } from '@/storage/DailyStatsStorage';

interface HourlyActivityChartProps {
    recentStats: DailyStat[]; // sorted newest first; needs up to 3 days to cover any timezone
}

function buildSlots(recentStats: DailyStat[]) {
    const now = new Date();
    // Floor to the start of the current local hour
    const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
    const slots: { label: string; 'Page views': number; Analyses: number }[] = [];

    for (let i = 47; i >= 0; i--) {
        const slotTime = new Date(currentHourStart.getTime() - i * 60 * 60 * 1000);
        const utcDate = slotTime.toISOString().split('T')[0];
        const utcHour = slotTime.getUTCHours();
        const day = recentStats.find((s) => s.date === utcDate);
        const bucket = day?.hourlyBreakdown?.[utcHour] ?? { pageViews: 0, analyses: 0 };
        const mm = String(slotTime.getMonth() + 1).padStart(2, '0');
        const dd = String(slotTime.getDate()).padStart(2, '0');
        const hh = String(slotTime.getHours()).padStart(2, '0');
        slots.push({
            label: `${mm}-${dd} ${hh}:00`,
            'Page views': bucket.pageViews,
            Analyses: bucket.analyses,
        });
    }

    return slots;
}

export function HourlyActivityChart({ recentStats }: HourlyActivityChartProps) {
    const theme = useTheme();
    const [hidden, setHidden] = useState<Set<string>>(new Set());
    const toggleSeries = (entry: { value: string }) => setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(entry.value)) next.delete(entry.value); else next.add(entry.value);
        return next;
    });

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
                    <Legend
                        wrapperStyle={{ fontSize: 12, paddingTop: 8, cursor: 'pointer' }}
                        iconType="square"
                        onClick={toggleSeries}
                        formatter={(value) => (
                            <span style={{ opacity: hidden.has(value) ? 0.4 : 1, userSelect: 'none' }}>{value}</span>
                        )}
                    />
                    <Bar dataKey="Page views" hide={hidden.has('Page views')} stackId="a" fill="#3B82F6" radius={[0, 0, 3, 3]} />
                    <Bar dataKey="Analyses" hide={hidden.has('Analyses')} stackId="a" fill="#10B981" radius={[3, 3, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
}
