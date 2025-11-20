'use client';

import {
    Box,
    Container,
    Typography,
    Paper,
    Divider,
    Button,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import Link from 'next/link';
import { AnalysisResult } from '@/storage/AnalysisResultStorage';
import { AppropriatenessCard } from '@/components/AppropriatenessCard';

interface AnalysisDisplayProps {
    result: AnalysisResult;
}

export function AnalysisDisplay({ result }: AnalysisDisplayProps) {
    return (
        <Box sx={{ minHeight: '100vh', py: 8 }}>
            <Container maxWidth="md">
                {/* Back Button */}
                <Box mb={3}>
                    <Button
                        component={Link}
                        href="/"
                        startIcon={<ArrowBack />}
                        variant="contained"
                    >
                        Back to Home
                    </Button>
                </Box>

                {/* Main Content Card */}
                <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
                    <Typography variant="h4" fontWeight="700" mb={1}>
                        Song Analysis Results
                    </Typography>
                    
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        Age-appropriate analysis for <strong>{result.age}</strong> year old
                    </Typography>

                    {/* Song Information */}
                    {result.song && (
                        <Box mb={4}>
                            <Typography variant="h5" fontWeight="600" mb={2}>
                                {result.song.songName || 'Unknown song'}
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                <strong>Artist:</strong> {result.song.artistName || 'Unknown artist'}
                            </Typography>
                            {result.song.albumName && (
                                <Typography variant="body1" color="text.secondary">
                                    <strong>Album:</strong> {result.song.albumName || 'Unknown album"'}
                                </Typography>
                            )}
                        </Box>
                    )}

                    {/* Appropriateness Card */}
                    <AppropriatenessCard 
                        age={result.age}
                        appropriate={result.appropriate}
                        recommendedAge={result.recommendedAge}
                        showShareButton={true}
                        songKey={result.songKey}
                        songTitle={result.song.songName || 'Unknown Song'}
                        artistName={result.song.artistName || 'Unknown Artist'}
                    />

                    {/* Analysis */}
                    <Box mb={4}>
                        <Typography variant="h6" fontWeight="600" mb={2}>
                            Detailed Analysis
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
                            {result.analysis}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            <Link href="/about">
                                <strong>Read more about this analysis and how we do it &raquo;</strong>
                            </Link>
                        </Typography>
                    </Box>

                    {/* Lyrics (if available) */}
                    {result.song?.lyrics && (
                        <Box mb={4}>
                            <Typography variant="h6" fontWeight="600" mb={2}>
                                Lyrics
                            </Typography>
                            <Paper 
                                sx={{ 
                                    p: 3, 
                                    maxHeight: 400, 
                                    overflow: 'auto',
                                    bgcolor: 'rgba(0, 0, 0, 0.02)',
                                }}
                            >
                                <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}
                                >
                                    {result.song.lyrics}
                                </Typography>
                            </Paper>
                        </Box>
                    )}

                    <Divider sx={{ my: 3, borderColor: 'rgba(255, 0, 255, 0.2)' }} />

                    {/* Disclaimer */}
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            fontWeight: 600,
                        }}
                    >
                        Remember: You know your child best. Use LyricsRay as a tool to inform your 
                        decisions, but always trust your parental instincts and family values when 
                        determining what&apos;s right for your children.
                    </Typography>

                    {/* Action Buttons */}
                    <Box display="flex" gap={2} mt={4}>
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
                            variant="contained"
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