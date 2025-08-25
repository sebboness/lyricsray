'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
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
    Modal,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemAvatar,
    Avatar,
    useMediaQuery,
    Link,
} from '@mui/material';
import {
    ChildCare,
    MusicNote,
    Search,
    Note,
    CheckCircle,
    Error,
    RecordVoiceOver,
    Close,
    WarningRounded,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

interface FormData {
    childAge: string;
    songName: string;
    songArtist: string;
    lyrics: string;
    inputMethod: 'search' | 'lyrics';
}

interface SongSearchResult {
    id: string;
    artist: string;
    album?: string;
    lyrics: string;
    thumbnail?: string;
    title: string;
}

interface AnalysisResult {
    appropriate: number;
    analysis: string;
    recommendedAge: string;
    error?: string;
}

interface AppropriateData {
    icon: React.JSX.Element;
    color: string;
    text: string;
}

/**
 * Gets display data based on appropriateness level
 * @param appropriate The appropriateness level as an integer
 * @returns Data based on appropriateness level
 */
const getAppropriateData = (appropriate: number): AppropriateData => {
    let icon = <></>;
    let color = '';
    let text = '';

    switch (appropriate) {
        case 1:
            icon = <CheckCircle sx={{ color: 'success.main', fontSize: 36 }} />;
            color = 'success.main';
            text = 'Appropriate for your child';
            break;
        case 2:
            icon = <WarningRounded sx={{ color: 'warning.main', fontSize: 36 }} />;
            color = 'warning.main';
            text = 'Contains themes that may not be appropriate for your child';
            break;
        case 3:
            icon = <Error sx={{ color: 'error.main', fontSize: 36 }} />;
            color = 'error.main';
            text = 'May not be appropriate for your child';
            break;
    }

    return {
        icon,
        color,
        text,
    }
}

export default function Home() {
    const theme = useTheme();
    
    const [formData, setFormData] = useState<FormData>({
        childAge: '',
        songName: '',
        songArtist: '',
        lyrics: '',
        inputMethod: 'search'
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchResults, setSearchResults] = useState<SongSearchResult[]>([]);
    const [showSongModal, setShowSongModal] = useState<boolean>(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [scrollY, setScrollY] = useState(0);
    const [windowW, setWindowW] = useState(window.innerWidth);

    // Handle scroll events
    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        const handleWidth = () => setWindowW(window.innerWidth);
        window.addEventListener('resize', handleWidth);
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('resize', handleWidth);
            window.removeEventListener('scroll', handleScroll)
        };
    }, []);

    // Calculate dynamic values based on scroll position
    const logoWidth = Math.min(1024, windowW);
    const logoRatio = logoWidth / 1024;
    const logoHeight = logoRatio * 880;
    const maxScroll = logoHeight * 0.8; // Start fading when 80% of logo would be scrolled past
    const scrollProgress = Math.min(scrollY / maxScroll, 1);
    const logoOpacity = Math.max(1 - scrollProgress, 0);

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
        // Clear previous results when switching tabs
        setResult(null);
        setSearchResults([]);
    };

    const searchSongs = async () => {
        setIsSearching(true);
        try {
            const response = await fetch('/api/search-song', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    songName: formData.songName,
                    artist: formData.songArtist
                }),
            });

            const data = await response.json();
            
            if (data.error) {
                setResult({
                    appropriate: 0,
                    analysis: '',
                    recommendedAge: '',
                    error: data.error
                });
                return;
            }

            if (data.songs && data.songs.length > 0) {
                setSearchResults(data.songs);
                if (data.songs.length === 1) {
                    // If only one result, proceed directly to analysis
                    analyzeLyricsDirectly(data.songs[0].lyrics);
                } else {
                    // Show modal for multiple results
                    setShowSongModal(true);
                }
            } else {
                setResult({
                    appropriate: 0,
                    analysis: '',
                    recommendedAge: '',
                    error: 'No songs found. Please try different search terms or paste lyrics directly.'
                });
            }
        } catch (error) {
            console.error('Error searching songs:', error);
            setResult({
                appropriate: 0,
                analysis: '',
                recommendedAge: '',
                error: 'Failed to search songs. Please try again.'
            });
        } finally {
            setIsSearching(false);
        }
    };

    const analyzeLyricsDirectly = async (lyrics: string | undefined | null) => {
        setIsLoading(true);
        setShowSongModal(false);
        
        try {
            const response = await fetch('/api/analyze-song', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    childAge: formData.childAge,
                    lyrics: lyrics || formData.lyrics,
                    inputMethod: 'lyrics'
                }),
            });

            const data: AnalysisResult = await response.json();
            setResult(data);

            setTimeout(() => {
                const element = document.getElementsByClassName('submit-wrapper');
                if (element && element.length)
                    element[0].scrollIntoView({ behavior: 'smooth' });
            }, 500);
        } catch (error) {
            console.error('Error analyzing lyrics:', error);
            setResult({
                appropriate: 0,
                analysis: '',
                recommendedAge: '',
                error: 'Failed to analyze lyrics. Please try again.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setResult(null); // Clear previous results
        
        if (formData.inputMethod === 'search') {
            await searchSongs();
        } else {
            await analyzeLyricsDirectly(null);
        }
    };

    const handleSongSelect = (song: SongSearchResult) => {
        analyzeLyricsDirectly(song.lyrics);
    };

    const handleCloseModal = () => {
        setShowSongModal(false);
        setSearchResults([]);
    };

    const isFormValid = formData.childAge && (
        (formData.inputMethod === 'search' && formData.songName && formData.songArtist) ||
        (formData.inputMethod === 'lyrics' && formData.lyrics.trim())
    );

    const appropriatenessData = getAppropriateData(result?.appropriate || 0);

    return (
        <Box sx={{ position: 'relative', minHeight: '100vh' }}>
            {/* Background Logo */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 48,
                    left: 0,
                    right: 0,
                    height: `${logoHeight}px`,
                    backgroundImage: 'url(/images/logo-transparent-no-text.png)',
                    backgroundPosition: 'top center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain',
                    opacity: logoOpacity,
                    zIndex: 1,
                    pointerEvents: 'none',
                    transition: 'opacity 0.1s ease-out',
                }}
            />

            {/* Main Content */}
            <Container 
                maxWidth="md" 
                sx={{ 
                    position: 'relative', 
                    zIndex: 10,
                    pt: `${logoHeight + 48}px`,
                    pb: 4,
                    transition: 'padding-top 0.1s ease-out',
                }}
            >
                {/* Introduction and Form Card */}
                <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>                        
                    <Typography variant="body1" color="text.secondary" component="p" sx={{ mb: 2 }}>
                        LyricsRay helps you determine whether a song is appropriate for your child 
                        based on its lyrics content. Using advanced AI analysis, we evaluate songs for explicit 
                        language, mature themes, and age-appropriate content.
                    </Typography>
                    
                    <Typography variant="body1" color="text.secondary" component="p" sx={{ mb: 3 }}>
                        Choose to search for a song by title and artist, or paste lyrics directly if you already have them. 
                        We will analyze the content and provide you with a detailed assessment and age recommendation.
                    </Typography>
                    
                    <Typography variant="body1" color="text.secondary" component="p" sx={{ mb: 3 }}>
                        <strong>Two ways to analyze:</strong> Search our database or paste any lyrics directly 
                        for instant analysis.
                    </Typography>
                    
                    {/* Form */}
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
                                    startAdornment: <ChildCare sx={{ color: theme.palette.primary.main, mr: 1 }} />
                                }}
                                placeholder="e.g., 12"
                                required
                                sx={{ maxWidth: 260 }}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>

                        <Divider sx={{ mb: 3, borderColor: 'rgba(255, 0, 255, 0.2)' }} />

                        {/* Tabbed Interface */}
                        <Box>
                            <Tabs 
                                value={formData.inputMethod} 
                                onChange={handleTabChange}
                                sx={{ 
                                    mb: 3,
                                    '& .MuiTab-root': {
                                        fontWeight: 600,
                                        '&.Mui-selected': {
                                            color: theme.palette.primary.main,
                                        },
                                    },
                                    '& .MuiTabs-indicator': {
                                        background: 'linear-gradient(90deg, #ff00ff, #00ccff)',
                                        height: 3,
                                    },
                                }}
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
                                        <Grid size={{ xs:12, md: 6 }}>
                                            <TextField
                                                name="songName"
                                                label="Song Name"
                                                value={formData.songName}
                                                onChange={handleInputChange}
                                                placeholder="e.g., Happy"
                                                required={formData.inputMethod === 'search'}
                                                fullWidth
                                                InputProps={{
                                                    startAdornment: <MusicNote sx={{ color: theme.palette.primary.main, mr: 1 }} />
                                                }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs:12, md: 6 }}>
                                            <TextField
                                                name="songArtist"
                                                label="Artist Name"
                                                value={formData.songArtist}
                                                onChange={handleInputChange}
                                                placeholder="e.g., Pharrell Williams"
                                                required={formData.inputMethod === 'search'}
                                                fullWidth
                                                InputProps={{
                                                    startAdornment: <RecordVoiceOver sx={{ color: theme.palette.primary.main, mr: 1 }} />
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
                        <Box textAlign="center" mt={4} className="submit-wrapper">
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={!isFormValid || isLoading || isSearching}
                                startIcon={(isLoading || isSearching) ? <CircularProgress size={20} /> : <Search />}
                                sx={{ px: 4, py: 1.5 }}
                            >
                                {isSearching ? 'Searching Songs...' : 
                                 isLoading ? 'Analyzing Song...' : 
                                 formData.inputMethod === 'search' ? 'Search & Analyze' : 'Analyze Lyrics'}
                            </Button>
                        </Box>
                    </Box>
                </Paper>

                {/* Song Selection Modal */}
                <Modal open={showSongModal} onClose={handleCloseModal}>
                    <Box sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: { xs: '90%', sm: 500 },
                        maxHeight: '80vh',
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        boxShadow: '0 0 50px rgba(255, 0, 255, 0.3)',
                        overflow: 'hidden'
                    }}>
                        <Box sx={{ 
                            p: 2, 
                            borderBottom: 1, 
                            borderColor: 'rgba(255, 0, 255, 0.2)', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.1), rgba(0, 204, 255, 0.1))',
                        }}>
                            <Typography variant="h6" component="h2">
                                Select the Correct Song
                            </Typography>
                            <Button onClick={handleCloseModal} size="small" sx={{ minWidth: 'auto', p: 1 }}>
                                <Close />
                            </Button>
                        </Box>
                        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                            <List>
                                {searchResults.map((song) => (
                                    <ListItem key={song.id} disablePadding>
                                        <ListItemButton 
                                            onClick={() => handleSongSelect(song)}
                                            sx={{
                                                '&:hover': {
                                                    background: 'rgba(255, 0, 255, 0.1)',
                                                },
                                            }}
                                        >
                                            <ListItemAvatar>
                                                <Avatar 
                                                    src={song.thumbnail} 
                                                    sx={{ 
                                                        bgcolor: 'rgba(255, 0, 255, 0.2)',
                                                        border: '1px solid rgba(255, 0, 255, 0.3)',
                                                    }}
                                                >
                                                    <MusicNote sx={{ color: theme.palette.primary.main }} />
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={song.title}
                                                secondary={`${song.artist}${song.album ? ` • ${song.album}` : ''}`}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </Box>
                </Modal>

                {/* Results Section */}
                {result && (
                    <Paper elevation={3} sx={{ p: 4, mt: 4, borderRadius: 3 }} className='analysis-results'>
                        <Typography variant="h5" fontWeight="600" mb={3}>
                            Analysis Results
                        </Typography>
                        
                        {result.error ? (
                            <Alert 
                                severity="error"
                                sx={{
                                    background: 'rgba(255, 51, 102, 0.1)',
                                    border: '1px solid rgba(255, 51, 102, 0.3)',
                                }}
                            >
                                {result.error}
                            </Alert>
                        ) : (
                            <Box>
                                <Card sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            {(appropriatenessData.icon)}
                                            <Box gap={2}>
                                                <Typography 
                                                    variant="h6" 
                                                    color={appropriatenessData.color}
                                                    fontWeight="600"
                                                >
                                                    {appropriatenessData.text}
                                                </Typography>

                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Recommended age:</strong> {result.recommendedAge}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                                
                                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                                    {result.analysis}
                                </Typography>

                                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                                    <Link href="/about">
                                        <strong>Read more about this analysis and how we do it &raquo;</strong>
                                    </Link>
                                </Typography>
                                
                                <Divider sx={{ my: 3, borderColor: 'rgba(255, 0, 255, 0.3)' }} />
                    
                                <Typography 
                                    variant="h6" 
                                    sx={{ 
                                        fontWeight: 600,
                                    }}
                                >
                                    Remember: You know your child best. Use LyricsRay as a tool to inform your decisions, but always trust your parental instincts and family values when determining what&apos;s right for your children.
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                )}
            </Container>
        </Box>
    );
}
