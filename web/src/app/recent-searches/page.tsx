import { Container, Typography } from '@mui/material';
import { RecentSearchesClient } from '@/components/RecentSearchesClient';
import { getRecentSearches } from '@/lib/getRecentSearches';

export const dynamic = 'force-dynamic';

// Sentinel marking "the root page" (no cursor) in the `history` query param's
// cursor stack — DynamoDB pagination is forward-only, so Prev/Next work by
// threading the chain of cursors that got us to the current page through the URL.
const ROOT_TOKEN = '~';

interface RecentSearchesPageProps {
    searchParams: Promise<{ cursor?: string; history?: string }>;
}

export default async function RecentSearches({ searchParams }: RecentSearchesPageProps) {
    const { cursor, history: historyParam } = await searchParams;
    const history = historyParam ? historyParam.split(',') : [];
    const { songs: recentSearches, nextCursor } = await getRecentSearches(cursor);

    let prevHref: string | undefined;
    if (cursor) {
        const prevCursor = history[history.length - 1];
        if (!prevCursor || prevCursor === ROOT_TOKEN) {
            prevHref = '/recent-searches';
        } else {
            const remaining = history.slice(0, -1);
            const params = new URLSearchParams({ cursor: prevCursor });
            if (remaining.length > 0) params.set('history', remaining.join(','));
            prevHref = `/recent-searches?${params.toString()}`;
        }
    }

    const nextHref = nextCursor
        ? `/recent-searches?${new URLSearchParams({
            cursor: nextCursor,
            history: [...history, cursor ?? ROOT_TOKEN].join(','),
        }).toString()}`
        : undefined;

    return (
        <Container maxWidth="md" sx={{ py: { xs: 4, sm: 8 } }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2rem', sm: '2.75rem' }, mb: 1 }}>
                Recent
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                The last songs analyzed by parents using LyricsRay.
            </Typography>

            <RecentSearchesClient songs={recentSearches} prevHref={prevHref} nextHref={nextHref} />
        </Container>
    );
}
