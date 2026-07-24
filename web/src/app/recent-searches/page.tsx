import { Container, Paper, Typography } from '@mui/material';
import { RecentSearchesClient } from '@/components/RecentSearchesClient';
import { getRecentSearches } from '@/lib/getRecentSearches';

export const dynamic = 'force-dynamic';

export default async function RecentSearches() {
    const recentSearches = await getRecentSearches();

    return (
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 10, py: 8 }}>
            <Paper
                elevation={3}
                sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 3,
                    textAlign: 'center'
                }}
            >
                <Typography variant="h1" sx={{ mb: 0, fontSize: { xs: '2.5rem', md: '3rem' } }}>
                    Recent song searches
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                    The last {recentSearches.length} songs analyzed by parents using LyricsRay.
                </Typography>
            </Paper>

            <RecentSearchesClient songs={recentSearches} />
        </Container>
    );
}
