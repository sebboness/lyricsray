import { Container, Typography } from '@mui/material';
import { RecentSearchesClient } from '@/components/RecentSearchesClient';
import { getRecentSearches } from '@/lib/getRecentSearches';

export const dynamic = 'force-dynamic';

// Sentinel marking "the root page" (no cursor) in the `history` query param's
// cursor stack — DynamoDB pagination is forward-only, so Prev/Next work by
// threading the chain of cursors that got us to the current page through the URL.
const ROOT_TOKEN = '~';

interface RecentSearchesPageProps {
    searchParams: Promise<{ cursor?: string; history?: string; appropriate?: string }>;
}

export default async function RecentSearches({ searchParams }: RecentSearchesPageProps) {
    const { cursor, history: historyParam, appropriate: appropriateParam } = await searchParams;
    const history = historyParam ? historyParam.split(',') : [];

    const parsedAppropriate = parseInt(appropriateParam ?? '', 10);
    const appropriate = [1, 2, 3].includes(parsedAppropriate) ? parsedAppropriate : undefined;

    const { songs: recentSearches, nextCursor } = await getRecentSearches(cursor, undefined, appropriate);

    const buildHref = (params: Record<string, string | undefined>) => {
        const search = new URLSearchParams();
        if (params.cursor) search.set('cursor', params.cursor);
        if (params.history) search.set('history', params.history);
        if (appropriate !== undefined) search.set('appropriate', String(appropriate));
        const query = search.toString();
        return query ? `/recent-searches?${query}` : '/recent-searches';
    };

    let prevHref: string | undefined;
    if (cursor) {
        const prevCursor = history[history.length - 1];
        if (!prevCursor || prevCursor === ROOT_TOKEN) {
            prevHref = buildHref({});
        } else {
            prevHref = buildHref({ cursor: prevCursor, history: history.slice(0, -1).join(',') || undefined });
        }
    }

    const nextHref = nextCursor
        ? buildHref({ cursor: nextCursor, history: [...history, cursor ?? ROOT_TOKEN].join(',') })
        : undefined;

    return (
        <Container maxWidth="md" sx={{ py: { xs: 4, sm: 8 } }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2rem', sm: '2.75rem' }, mb: 1 }}>
                Recent
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Recent songs analyzed by parents using LyricsRay.
            </Typography>

            <RecentSearchesClient songs={recentSearches} prevHref={prevHref} nextHref={nextHref} appropriate={appropriate} />
        </Container>
    );
}
