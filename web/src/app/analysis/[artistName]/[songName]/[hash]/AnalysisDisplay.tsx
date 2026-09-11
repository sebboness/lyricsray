'use client';

import {
    Box,
    Container,
    Typography,
    Paper,
    Divider,
    Button,
    Link as MuiLink,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { AnalysisResult } from '@/storage/AnalysisResultStorage';
import { AppropriatenessCard } from '@/components/AppropriatenessCard';
import { EyebrowLabel } from '@/components/EyebrowLabel';
import { ShareButtonWithModal } from '@/components/ShareButtonWithModal';
import { KO_FI_LINK } from '@/util/supportDev';
import { trackEvent } from '@/util/trackEvent';
import { ThemeBreakdown } from '@/components/ThemeBreakdown';
import { ExplicitContentGate } from '@/components/ExplicitContentGate';
import { LyricsPaper } from '@/components/LyricsPaper';

interface AnalysisDisplayProps {
    result: AnalysisResult;
}

export function AnalysisDisplay({ result }: AnalysisDisplayProps) {
    const lyrics = result.song?.lyrics;

    return (
        <Box sx={{ minHeight: '100vh', py: 8 }}>
            <Container maxWidth="md">
                {/* Back Button */}
                <Box mb={3}>
                    <Button component={Link} href="/" startIcon={<ArrowBack />} variant="outlined">
                        Back to Home
                    </Button>
                </Box>

                {/* Main Content Card */}
                <Paper sx={{ p: { xs: 3, sm: 4 } }}>
                    {/* Song Information */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                        <Box>
                            <EyebrowLabel>Analysis</EyebrowLabel>
                            <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                                {result.song?.songName || 'Unknown song'}
                            </Typography>
                            {result.song?.artistName && result.song.artistName.toLowerCase() !== 'unknown' ? (
                                <Typography variant="body1" sx={{ mt: 0.25 }}>
                                    <MuiLink
                                        component={Link}
                                        href={`/analysis/${result.songKey.split('/')[0]}`}
                                        sx={{
                                            color: 'primary.main',
                                            fontWeight: 600,
                                            textDecoration: 'underline',
                                            textUnderlineOffset: '3px',
                                            '&:hover': { color: 'primary.light' },
                                        }}
                                    >
                                        {result.song.artistName}
                                    </MuiLink>
                                    {result.song.albumName && (
                                        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                                            {' '}· {result.song.albumName}
                                        </Box>
                                    )}
                                </Typography>
                            ) : (
                                result.song?.albumName && (
                                    <Typography variant="body2" color="text.secondary">
                                        {result.song.albumName}
                                    </Typography>
                                )
                            )}
                        </Box>
                        <ShareButtonWithModal
                            songKey={result.songKey}
                            songTitle={result.song?.songName || 'Unknown Song'}
                            artistName={result.song?.artistName || 'Unknown Artist'}
                        />
                    </Box>

                    {/* Appropriateness Card */}
                    <AppropriatenessCard
                        appropriate={result.appropriate}
                        recommendedAge={result.recommendedAge}
                        summary={result.summary}
                    />

                    {/* Analysis */}
                    <Box mb={4}>
                        <Typography variant="h6" fontWeight="600" mb={2}>
                            Detailed Analysis
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
                            {result.analysis}
                        </Typography>

                        {result.themes && result.themes.length > 0 && (
                            <>
                                <Typography variant="h6" fontWeight="600" mb={2}>
                                    Themes
                                </Typography>
                                <ThemeBreakdown themes={result.themes} themePercentages={result.themePercentages} />
                            </>
                        )}

                        <Typography variant="body1" color="text.secondary" mt={2}>
                            <Link href="/about">
                                <strong>Read more about this analysis and how we do it &raquo;</strong>
                            </Link>
                        </Typography>
                    </Box>

                    {/* Lyrics (if available) */}
                    {lyrics && (
                        <Box mb={4}>
                            <Typography variant="h6" fontWeight="600" mb={2}>
                                Lyrics
                            </Typography>
                            {result.appropriate === 3 ? (
                                <ExplicitContentGate>
                                    {() => <LyricsPaper lyrics={lyrics} />}
                                </ExplicitContentGate>
                            ) : (
                                <LyricsPaper lyrics={lyrics} />
                            )}
                        </Box>
                    )}

                    <Divider sx={{ my: 3 }} />

                    {/* Disclaimer */}
                    <Typography
                        variant="h6"
                        mb={3}
                        sx={{
                            fontWeight: 600,
                        }}
                    >
                        Remember: You know your child best. Use LyricsRay as a tool to inform your
                        decisions, but always trust your parental instincts and family values when
                        determining what&apos;s right for your children.
                    </Typography>

                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Did this analysis help you?
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        If so, consider supporting the project to cover some of the development and
                        hosting costs ❤️
                    </Typography>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }} mt={4}>
                        <Button
                            variant="outlined"
                            size="large"
                            sx={{ px: 4, py: 1.5 }}
                            onClick={() => {
                                trackEvent('externalLink', { linkTarget: 'kofi-profile', linkContext: 'analysisDisplay' });
                                window.open(KO_FI_LINK, '_blank', 'noopener,noreferrer');
                            }}
                        >
                            ☕ Support on Ko-fi
                        </Button>
                        <Button
                            component={Link}
                            href="/"
                            variant="contained"
                            size="large"
                        >
                            Analyze Another Song
                        </Button>
                        <Button
                            component={Link}
                            href="/about"
                            variant="outlined"
                            size="large"
                        >
                            Learn More
                        </Button>
                    </Box>

                    {/* Analysis Date */}
                    {result.date && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
                            Analysis performed on {new Date(result.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </Typography>
                    )}
                </Paper>
            </Container>
        </Box>
    );
}
