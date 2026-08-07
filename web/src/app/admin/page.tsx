import { Box, Divider, Grid, Tooltip, Typography } from '@mui/material';
import { Suspense } from 'react';
import { getSession } from '@/lib/session';
import { getDynamoDbClient } from '@/storage/dynamodb';
import { DailyStatsStorage, DailyStat } from '@/storage/DailyStatsStorage';
import { StatTile } from '@/components/admin/StatTile';
import { AnalysisChart } from '@/components/admin/AnalysisChart';
import { UaBreakdownChart } from '@/components/admin/UaBreakdownChart';
import { TopSongsTable } from '@/components/admin/TopSongsTable';
import { VisitorsChart } from '@/components/admin/VisitorsChart';
import { HourlyActivityChart } from '@/components/admin/HourlyActivityChart';
import { NotFoundSongKeysTable } from '@/components/admin/NotFoundSongKeysTable';
import { DayRangeFilter } from '@/components/admin/DayRangeFilter';

const statsStorage = new DailyStatsStorage(getDynamoDbClient());

const VALID_DAYS = [7, 14, 30] as const;
const DEFAULT_DAYS = 30;

interface AdminDashboardPageProps {
    searchParams: Promise<{ days?: string }>;
}

function computeLast24h(stats: DailyStat[]): { pageViews: number; analyses: number } {
    const now = new Date();
    let pageViews = 0;
    let analyses = 0;

    for (let i = 0; i < 24; i++) {
        const target = new Date(now.getTime() - i * 60 * 60 * 1000);
        const date = target.toISOString().split('T')[0];
        const hour = target.getUTCHours();
        const bucket = stats.find((s) => s.date === date)?.hourlyBreakdown?.[hour];
        if (bucket) {
            pageViews += bucket.pageViews;
            analyses += bucket.analyses;
        }
    }

    return { pageViews, analyses };
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
    const { days: daysParam } = await searchParams;
    const days = (VALID_DAYS as readonly number[]).includes(parseInt(daysParam ?? '', 10))
        ? parseInt(daysParam!, 10)
        : DEFAULT_DAYS;

    const session = await getSession();
    const firstName = session?.fullName?.split(' ')[0] || session?.email?.split('@')[0] || 'there';

    const stats = await statsStorage.getDailyStats(days);
    const today = stats[0]; // sorted newest first — used for engagement tiles

    const last24h = computeLast24h(stats);

    const sharesToday = today?.totalShares ?? 0;
    const ctaClicksToday = today?.totalCtaClicks ?? 0;
    const ctaDismissalsToday = today?.totalCtaDismissals ?? 0;
    const externalLinkClicksToday = today?.totalExternalLinkClicks ?? 0;
    const externalLinkSub = (() => {
        const b = today?.externalLinkBreakdown;
        if (!b) return undefined;
        const parts = [];
        if (b['kofi-profile']) parts.push(`${b['kofi-profile']} Ko-fi`);
        if (b.hexonite) parts.push(`${b.hexonite} Hexonite`);
        return parts.length > 0 ? parts.join(', ') : undefined;
    })();

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Typography variant="h4" component="h1">
                    Welcome, {firstName}
                </Typography>
                <Suspense>
                    <DayRangeFilter />
                </Suspense>
            </Box>

            {/* Last 24h stat tiles */}
            <Typography variant="h6" sx={{ mb: 1.5 }}>Stats last 24 hours</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <StatTile label="Analyses" value={last24h.analyses} />
                <StatTile label="Page views" value={last24h.pageViews} />
            </Box>

            {/* Engagement stat tiles — from most recent rollup day */}
            <Typography variant="h6" sx={{ mb: 1.5 }}>Engagement (most recent day)</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
                <StatTile label="Shares" value={sharesToday} />
                <StatTile
                    label="Ko-fi CTA clicks"
                    value={ctaClicksToday}
                    sub={ctaDismissalsToday > 0 ? `${ctaDismissalsToday} dismissed` : undefined}
                />
                <StatTile label="External link clicks" value={externalLinkClicksToday} sub={externalLinkSub} />
                <Tooltip
                    title="Unique visitors are counted per day and cannot be de-duplicated across a date range. This sum may count the same visitor more than once."
                    placement="top"
                    arrow
                >
                    <span>
                        <StatTile
                            label="Unique visitors (approx.)"
                            value={`~${today?.uniqueHashedIps ?? 0}`}
                            sub="by hashed IP"
                        />
                    </span>
                </Tooltip>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Charts */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <AnalysisChart stats={stats} />
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <UaBreakdownChart stats={stats} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <VisitorsChart stats={stats} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <HourlyActivityChart recentStats={stats.slice(0, 2)} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <TopSongsTable stats={stats} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <NotFoundSongKeysTable stats={stats} />
                </Grid>
            </Grid>
        </>
    );
}
