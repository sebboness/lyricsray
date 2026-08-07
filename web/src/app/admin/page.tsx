import { Box, Divider, Grid, Typography } from '@mui/material';
import { getSession } from '@/lib/session';
import { getDynamoDbClient } from '@/storage/dynamodb';
import { DailyStatsStorage } from '@/storage/DailyStatsStorage';
import { StatTile } from '@/components/admin/StatTile';
import { AnalysisChart } from '@/components/admin/AnalysisChart';
import { UaBreakdownChart } from '@/components/admin/UaBreakdownChart';
import { TopSongsTable } from '@/components/admin/TopSongsTable';
import { NotFoundSongKeysTable } from '@/components/admin/NotFoundSongKeysTable';
import { VisitorsChart } from '@/components/admin/VisitorsChart';

const statsStorage = new DailyStatsStorage(getDynamoDbClient());

export default async function AdminDashboardPage() {
    const session = await getSession();
    const firstName = session?.fullName?.split(' ')[0] || session?.email?.split('@')[0] || 'there';

    const stats = await statsStorage.getDailyStats(30);
    const today = stats[0]; // sorted newest first

    const totalAnalysesToday = today?.totalAnalyses ?? 0;
    const cacheHitRate = totalAnalysesToday > 0
        ? Math.round(((today?.cacheHits ?? 0) / totalAnalysesToday) * 100)
        : 0;
    const pageViewsToday = today?.totalPageViews ?? 0;
    const uniqueIpsToday = today?.uniqueHashedIps ?? 0;
    const sharesToday = today?.totalShares ?? 0;
    const ctaClicksToday = today?.totalCtaClicks ?? 0;
    const ctaDismissalsToday = today?.totalCtaDismissals ?? 0;
    const externalLinkClicksToday = today?.totalExternalLinkClicks ?? 0;

    return (
        <>
            <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
                Welcome, {firstName}
            </Typography>

            {/* Core stat tiles */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <StatTile
                    label="Analyses today"
                    value={totalAnalysesToday}
                    sub={`${today?.cacheHits ?? 0} from cache, ${today?.cacheMisses ?? 0} new`}
                />
                <StatTile
                    label="Cache hit rate"
                    value={`${cacheHitRate}%`}
                    sub="today"
                />
                <StatTile
                    label="Page views today"
                    value={pageViewsToday}
                />
                <StatTile
                    label="Unique visitors today"
                    value={uniqueIpsToday}
                    sub="by hashed IP"
                />
            </Box>

            {/* Engagement stat tiles */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
                <StatTile
                    label="Shares today"
                    value={sharesToday}
                />
                <StatTile
                    label="Ko-fi CTA clicks today"
                    value={ctaClicksToday}
                    sub={ctaDismissalsToday > 0 ? `${ctaDismissalsToday} dismissed` : undefined}
                />
                <StatTile
                    label="External link clicks today"
                    value={externalLinkClicksToday}
                />
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
                    <TopSongsTable stats={stats} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <NotFoundSongKeysTable stats={stats} />
                </Grid>
            </Grid>
        </>
    );
}
