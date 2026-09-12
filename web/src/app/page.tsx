import { Box, Link, Paper, Typography } from '@mui/material';
import { HomeHero } from '@/components/HomeHero';
import { WhatKidsArePlaying } from '@/components/WhatKidsArePlaying';
import { LyricsAnalysisForm } from '@/components/LyricsAnalysisForm';
import { getPopularSongs } from '@/lib/getPopularSongs';

export const dynamic = 'force-dynamic';

export default async function Home() {

    // Fetch popular songs data on the server
    const popularSongs = await getPopularSongs(7);

    return (
        <HomeHero
            sidebar={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <WhatKidsArePlaying songs={popularSongs} />

                    <Paper sx={{ p: 3 }}>
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>
                            Built by a parent, not a label
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            As a parent, I started wondering how much song lyrics actually matter for kids.
                        </Typography>
                        <Link href="/about" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            Read the story
                        </Link>
                    </Paper>
                </Box>
            }
        >
            <LyricsAnalysisForm />
        </HomeHero>
    );
}
