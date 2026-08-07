'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Typography, Box, useTheme } from '@mui/material';
import { DailyStat } from '@/storage/DailyStatsStorage';
import { utcDateToLocalMonthDay } from '@/util/dateFormat';

interface VisitorsChartProps {
    stats: DailyStat[];
}

export function VisitorsChart({ stats }: VisitorsChartProps) {
    const theme = useTheme();

    const data = [...stats].reverse().map((s) => ({
        date: utcDateToLocalMonthDay(s.date),
        Person: s.uaBreakdown?.person ?? 0,
        'Search engine': s.uaBreakdown?.searchEngine ?? 0,
        'AI crawler': s.uaBreakdown?.aiCrawler ?? 0,
        Bot: s.uaBreakdown?.bot ?? 0,
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
                Page views per day (last 30 days)
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
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="square" />
                    <Bar dataKey="Person" stackId="a" fill="#3B82F6" radius={[0, 0, 3, 3]} />
                    <Bar dataKey="Search engine" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="AI crawler" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Bot" stackId="a" fill="#6B7280" radius={[3, 3, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
}
