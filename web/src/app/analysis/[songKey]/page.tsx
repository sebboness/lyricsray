import { notFound } from 'next/navigation';
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

interface PageProps {
    params: Promise<{
        songKey: string;
    }>;
}

/**
 * Fetches analysis result from API endpoint
 */
async function getAnalysisResult(songKey: string): Promise<AnalysisResult | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/analyze-song/${encodeURIComponent(songKey)}`, {
            cache: 'no-store', // Ensure fresh data on each request
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.result || null;
    } catch (error) {
        console.error('Error fetching analysis result:', error);
        return null;
    }
}

export default async function AnalysisDetailsPage({ params }: PageProps) {
    const { songKey } = await params;
    const decodedSongKey = decodeURIComponent(songKey);
    
    // Fetch the analysis result
    const result = await getAnalysisResult(decodedSongKey);
    
    // If not found, show 404
    if (!result) {
        notFound();
    }

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
                                {result.song.songName || 'Unknown Song'}
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                <strong>Artist:</strong> {result.song.artistName || 'Unknown Artist'}
                            </Typography>
                            {result.song.albumName && (
                                <Typography variant="body1" color="text.secondary">
                                    <strong>Album:</strong> {result.song.albumName}
                                </Typography>
                            )}
                        </Box>
                    )}

                    {/* Appropriateness Card */}
                    <AppropriatenessCard 
                        appropriate={result.appropriate}
                        recommendedAge={result.recommendedAge}
                    />

                    {/* Analysis */}
                    <Box mb={4}>
                        <Typography variant="h6" fontWeight="600" mb={2}>
                            Detailed Analysis
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                            {result.analysis}
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
                        variant="body1" 
                        sx={{ 
                            fontWeight: 600,
                            color: 'text.secondary',
                            fontStyle: 'italic',
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

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
    const { songKey } = await params;
    const decodedSongKey = decodeURIComponent(songKey);
    const result = await getAnalysisResult(decodedSongKey);

    if (!result) {
        return {
            title: 'Analysis Not Found | LyricsRay',
        };
    }

    const songTitle = result.song?.songName || 'Unknown Song';
    const artist = result.song?.artistName || 'Unknown Artist';

    return {
        title: `${songTitle} by ${artist} - Analysis | LyricsRay`,
        description: `Age-appropriate lyrics analysis for "${songTitle}" by ${artist}. `
            + `Recommended age: ${result.recommendedAge}. `
            + `Analysis ${result.analysis.length > 100 ? (result.analysis.substring(0, 100) + '...') : result.analysis}`,
    };
}