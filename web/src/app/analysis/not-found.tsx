'use client';

import NextLink from 'next/link';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import MusicOffIcon from '@mui/icons-material/MusicOff';
import SearchIcon from '@mui/icons-material/Search';

export default function AnalysisNotFound() {
    return (
        <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
            <Paper elevation={2} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3, textAlign: 'center' }}>
                <MusicOffIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 2 }} />

                <Typography variant="h4" fontWeight={700} gutterBottom>
                    We Couldn&apos;t Find That Analysis
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                    It looks like this song hasn&apos;t been analyzed on LyricsRay yet. That doesn&apos;t mean it can&apos;t be!
                    Head back to the home page and give it a try. You might be the first to find out.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 4 }}>
                    <Button
                        component={NextLink}
                        href="/"
                        variant="contained"
                        size="large"
                    >
                        Analyze a Song
                    </Button>
                    <Button
                        component={NextLink}
                        href="/recent-searches"
                        variant="contained"
                        startIcon={<SearchIcon />}
                        size="large"
                    >
                        Browse Recent Analyses
                    </Button>
                </Box>

                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 4 }}>
                    If you followed a saved link, the analysis may have been updated or the URL may have changed.
                </Typography>
            </Paper>
        </Container>
    );
}
