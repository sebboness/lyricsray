'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    TextField,
    Button,
    Tabs,
    Tab,
    Alert,
    CircularProgress,
    Divider,
    Card,
    CardContent,
    Grid,
    Chip
} from '@mui/material';
import {
    ChildCare,
    MusicNote,
    Search,
    Note,
    CheckCircle,
    Error,
    Security,
    RecordVoiceOver
} from '@mui/icons-material';

interface FormData {
    childAge: string;
    songName: string;
    songArtist: string;
    lyrics: string;
    inputMethod: 'search' | 'lyrics';
}

interface AnalysisResult {
    appropriate: boolean;
    analysis: string;
    recommendedAge: string;
    error?: string;
}

export default function Home() {
    const [formData, setFormData] = useState<FormData>({
        childAge: '',
        songName: '',
        songArtist: '',
        lyrics: '',
        inputMethod: 'search'
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
        ...prev,
        [name]: value
        }));
    };

    const handleTabChange = (_: React.SyntheticEvent, newValue: 'search' | 'lyrics') => {
        setFormData(prev => ({
        ...prev,
        inputMethod: newValue,
        ...(newValue === 'search' ? { lyrics: '' } : { songName: '', songArtist: '' })
        }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
        const response = await fetch('/api/analyze-song', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });
        
        const data: AnalysisResult = await response.json();
        setResult(data);
        } catch (error) {
        console.error('Error analyzing song:', error);
        setResult({ 
            appropriate: false, 
            analysis: '', 
            recommendedAge: '', 
            error: 'Failed to analyze song. Please try again.' 
        });
        } finally {
        setIsLoading(false);
        }
    };

    const isFormValid = formData.childAge && (
        (formData.inputMethod === 'search' && formData.songName && formData.songArtist) ||
        (formData.inputMethod === 'lyrics' && formData.lyrics.trim())
    );

    return (
        <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
        py: 4 
        }}>
        <Container maxWidth="md">
            {/* Header */}
            <Box textAlign="center" mb={4}>
            <Typography variant="h2" component="h1" fontWeight="bold" color="primary" mb={2}>
                🎵 LyricsRay
            </Typography>
            <Box sx={{ 
                width: 96, 
                height: 4, 
                background: 'linear-gradient(90deg, #1976d2, #9c27b0)',
                borderRadius: 2,
                mx: 'auto' 
            }} />
            </Box>

            {/* Introduction Card */}
            <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
            <Box textAlign="center" mb={3}>
                <Box sx={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                bgcolor: 'primary.light',
                borderRadius: '50%',
                mb: 2
                }}>
                <Security sx={{ fontSize: 32, color: 'primary.main' }} />
                </Box>
                <Typography variant="h4" component="h2" fontWeight="600" mb={2}>
                Welcome, Parents!
                </Typography>
            </Box>
            
            <Typography variant="body1" color="text.secondary" paragraph>
                LyricsRay helps you determine whether a song is appropriate for your child 
                based on its lyrics content. Using advanced AI analysis, we evaluate songs for explicit 
                language, mature themes, and age-appropriate content.
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
                Choose to search for a song by title and artist, or paste lyrics directly if you already have them. 
                We will analyze the content and provide you with a detailed assessment and age recommendation.
            </Typography>
            
            <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                <strong>Two ways to analyze:</strong> Search our database or paste any lyrics directly 
                for instant analysis.
                </Typography>
            </Alert>
            </Paper>

            {/* Form Card */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
            <Box component="form" onSubmit={handleSubmit}>
                {/* Child Age Input */}
                <Box mb={3}>
                <TextField
                    name="childAge"
                    label="Child's Age"
                    type="number"
                    value={formData.childAge}
                    onChange={handleInputChange}
                    InputProps={{
                        inputProps: { min: 1, max: 17 },
                        startAdornment: <ChildCare sx={{ color: 'action.active', mr: 1 }} />
                    }}
                    placeholder="e.g., 12"
                    required
                    sx={{ maxWidth: 240 }}
                    InputLabelProps={{ shrink: true }}
                />
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Tabbed Interface */}
                <Box>
                <Tabs 
                    value={formData.inputMethod} 
                    onChange={handleTabChange}
                    sx={{ mb: 3 }}
                    variant="fullWidth"
                >
                    <Tab 
                    value="search" 
                    label="Search by Song & Artist" 
                    icon={<Search />}
                    iconPosition="start"
                    />
                    <Tab 
                    value="lyrics" 
                    label="Paste Lyrics Directly" 
                    icon={<Note />}
                    iconPosition="start"
                    />
                </Tabs>

                {/* Tab Content */}
                <Box sx={{ minHeight: 200 }}>
                    {formData.inputMethod === 'search' ? (
                    <Grid container spacing={3}>
                        <Grid size={{xs: 12,  md: 6}}>
                            <TextField
                                name="songName"
                                label="Song Name"
                                value={formData.songName}
                                onChange={handleInputChange}
                                placeholder="e.g., Happy"
                                required={formData.inputMethod === 'search'}
                                fullWidth
                                InputProps={{
                                    startAdornment: <MusicNote sx={{ color: 'action.active', mr: 1 }} />
                                }}
                            />
                        </Grid>
                        <Grid size={{xs: 12,  md: 6}}>
                            <TextField
                                name="songArtist"
                                label="Artist Name"
                                value={formData.songArtist}
                                onChange={handleInputChange}
                                placeholder="e.g., Pharrell Williams"
                                required={formData.inputMethod === 'search'}
                                fullWidth
                                InputProps={{
                                    startAdornment: <RecordVoiceOver sx={{ color: 'action.active', mr: 1 }} />
                                }}
                            />
                        </Grid>
                    </Grid>
                    ) : (
                    <Box>
                        <TextField
                        name="lyrics"
                        label="Song Lyrics"
                        value={formData.lyrics}
                        onChange={handleInputChange}
                        multiline
                        rows={8}
                        placeholder="Paste the complete song lyrics here..."
                        required={formData.inputMethod === 'lyrics'}
                        fullWidth
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        💡 Tip: Paste the complete lyrics for the most accurate analysis
                        </Typography>
                    </Box>
                    )}
                </Box>
                </Box>

                {/* Submit Button */}
                <Box textAlign="center" mt={4}>
                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={!isFormValid || isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} /> : <Search />}
                    sx={{ 
                    px: 4, 
                    py: 1.5,
                    background: 'linear-gradient(45deg, #1976d2, #9c27b0)',
                    '&:hover': {
                        background: 'linear-gradient(45deg, #1565c0, #7b1fa2)',
                    }
                    }}
                >
                    {isLoading ? 'Analyzing Song...' : 'Check Song Safety'}
                </Button>
                </Box>
            </Box>
            </Paper>

            {/* Results Section */}
            {result && (
            <Paper elevation={3} sx={{ p: 4, mt: 4, borderRadius: 3 }}>
                <Typography variant="h5" fontWeight="600" mb={3}>
                Analysis Results
                </Typography>
                
                {result.error ? (
                <Alert severity="error">
                    {result.error}
                </Alert>
                ) : (
                <Box>
                    <Card sx={{ mb: 2 }}>
                    <CardContent>
                        <Box display="flex" alignItems="center" gap={2}>
                        {result.appropriate ? (
                            <CheckCircle sx={{ color: 'success.main', fontSize: 28 }} />
                        ) : (
                            <Error sx={{ color: 'error.main', fontSize: 28 }} />
                        )}
                        <Typography 
                            variant="h6" 
                            color={result.appropriate ? 'success.main' : 'error.main'}
                            fontWeight="600"
                        >
                            {result.appropriate 
                            ? 'Appropriate for your child' 
                            : 'May not be appropriate for your child'
                            }
                        </Typography>
                        </Box>
                    </CardContent>
                    </Card>
                    
                    <Card>
                    <CardContent>
                        <Typography variant="body1" color="text.secondary">
                        {result.analysis}
                        </Typography>
                    </CardContent>
                    </Card>
                </Box>
                )}
            </Paper>
            )}
        </Container>
        </Box>
    );
}