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
    Switch,
    FormControlLabel,
    useMediaQuery
} from '@mui/material';
import {
    ChildCare,
    MusicNote,
    Search,
    Note,
    CheckCircle,
    Error,
    Security,
    RecordVoiceOver,
    Close,
    DarkMode,
    LightMode
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

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
    appropriate: boolean;
    analysis: string;
    recommendedAge: string;
    error?: string;
}

export default function Home() {
    const [darkMode, setDarkMode] = useState(true);
    const [mounted, setMounted] = useState(false);
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    
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

    useEffect(() => {
        setMounted(true);
        setDarkMode(prefersDarkMode);
    }, [prefersDarkMode]);

    // Cyberpunk/Synthwave theme with colors extracted from logo
    const theme = createTheme({
        palette: {
            mode: darkMode ? 'dark' : 'light',
            primary: {
                main: darkMode ? '#ff00ff' : '#8b00ff', // Magenta/Purple from logo
                light: '#ff66ff',
                dark: '#cc00cc',
            },
            secondary: {
                main: darkMode ? '#00ccff' : '#0066cc', // Cyan blue from logo
                light: '#66d9ff',
                dark: '#0099cc',
            },
            background: {
                default: darkMode ? '#0a0a0f' : '#f8f9ff',
                paper: darkMode ? '#1a1a2e' : '#ffffff',
            },
            text: {
                primary: darkMode ? '#ffffff' : '#1a1a2e',
                secondary: darkMode ? '#ccccff' : '#666699',
            },
            info: {
                main: darkMode ? '#9933ff' : '#6600cc', // Purple accent from logo
            },
            success: {
                main: darkMode ? '#00ff88' : '#00cc66',
            },
            error: {
                main: darkMode ? '#ff3366' : '#cc0033',
            },
            warning: {
                main: darkMode ? '#ffaa00' : '#ff8800',
            },
        },
        typography: {
            fontFamily: '"Orbitron", "Roboto", "Arial", sans-serif',
            h1: {
                fontWeight: 700,
                fontSize: '3rem',
                background: darkMode 
                    ? 'linear-gradient(45deg, #ff00ff 30%, #00ccff 90%)'
                    : 'linear-gradient(45deg, #8b00ff 30%, #0066cc 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: darkMode ? '0 0 20px rgba(255, 0, 255, 0.5)' : 'none',
            },
            h2: {
                fontWeight: 600,
                color: darkMode ? '#ff00ff' : '#8b00ff',
            },
            h4: {
                fontWeight: 600,
                color: darkMode ? '#00ccff' : '#0066cc',
            },
            h5: {
                fontWeight: 600,
                color: darkMode ? '#ff00ff' : '#8b00ff',
            },
            h6: {
                fontWeight: 600,
            },
            body1: {
                lineHeight: 1.6,
            },
        },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: darkMode 
                            ? 'linear-gradient(135deg, rgba(255, 0, 255, 0.1) 0%, rgba(0, 204, 255, 0.1) 100%)'
                            : 'linear-gradient(135deg, rgba(139, 0, 255, 0.05) 0%, rgba(0, 102, 204, 0.05) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: darkMode 
                            ? '1px solid rgba(255, 0, 255, 0.2)'
                            : '1px solid rgba(139, 0, 255, 0.2)',
                        boxShadow: darkMode
                            ? '0 8px 32px rgba(255, 0, 255, 0.1)'
                            : '0 4px 16px rgba(0, 0, 0, 0.1)',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        background: darkMode
                            ? 'linear-gradient(45deg, #ff00ff 30%, #00ccff 90%)'
                            : 'linear-gradient(45deg, #8b00ff 30%, #0066cc 90%)',
                        boxShadow: darkMode
                            ? '0 4px 20px rgba(255, 0, 255, 0.3)'
                            : '0 4px 15px rgba(139, 0, 255, 0.2)',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: darkMode
                                ? '0 6px 25px rgba(255, 0, 255, 0.4)'
                                : '0 6px 20px rgba(139, 0, 255, 0.3)',
                        },
                    },
                },
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                                borderColor: darkMode ? 'rgba(255, 0, 255, 0.3)' : 'rgba(139, 0, 255, 0.3)',
                            },
                            '&:hover fieldset': {
                                borderColor: darkMode ? '#ff00ff' : '#8b00ff',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: darkMode ? '#00ccff' : '#0066cc',
                                boxShadow: darkMode 
                                    ? '0 0 10px rgba(0, 204, 255, 0.3)'
                                    : '0 0 5px rgba(0, 102, 204, 0.3)',
                            },
                        },
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: darkMode
                                ? '0 12px 40px rgba(255, 0, 255, 0.2)'
                                : '0 8px 30px rgba(139, 0, 255, 0.15)',
                        },
                    },
                },
            },
            MuiModal: {
                styleOverrides: {
                    root: {
                        '& .MuiPaper-root': {
                            border: darkMode 
                                ? '2px solid rgba(255, 0, 255, 0.3)'
                                : '2px solid rgba(139, 0, 255, 0.3)',
                        },
                    },
                },
            },
        },
    });

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
                    appropriate: false,
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
                    appropriate: false,
                    analysis: '',
                    recommendedAge: '',
                    error: 'No songs found. Please try different search terms or paste lyrics directly.'
                });
            }
        } catch (error) {
            console.error('Error searching songs:', error);
            setResult({
                appropriate: false,
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
        } catch (error) {
            console.error('Error analyzing lyrics:', error);
            setResult({
                appropriate: false,
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

    if (!mounted) {
        return null; // Prevent hydration mismatch
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ 
                minHeight: '100vh',
                background: darkMode
                    ? 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)'
                    : 'linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 50%, #d8e8ff 100%)',
                position: 'relative',
                overflow: 'hidden',
                py: 4 
            }}>
                {/* Animated background elements */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: darkMode
                            ? `radial-gradient(circle at 20% 20%, rgba(255, 0, 255, 0.1) 0%, transparent 50%),
                               radial-gradient(circle at 80% 80%, rgba(0, 204, 255, 0.1) 0%, transparent 50%),
                               radial-gradient(circle at 40% 60%, rgba(153, 51, 255, 0.05) 0%, transparent 50%)`
                            : `radial-gradient(circle at 20% 20%, rgba(139, 0, 255, 0.05) 0%, transparent 50%),
                               radial-gradient(circle at 80% 80%, rgba(0, 102, 204, 0.05) 0%, transparent 50%)`,
                        animation: 'pulse 4s ease-in-out infinite',
                        '@keyframes pulse': {
                            '0%, 100%': { opacity: 0.7 },
                            '50%': { opacity: 1 },
                        },
                    }}
                />

                <Container maxWidth="md" sx={{ position: 'relative', zIndex: 10 }}>
                    {/* Header with Theme Toggle */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={darkMode}
                                    onChange={(e) => setDarkMode(e.target.checked)}
                                    sx={{
                                        '& .MuiSwitch-thumb': {
                                            backgroundColor: darkMode ? '#ff00ff' : '#8b00ff',
                                        },
                                        '& .MuiSwitch-track': {
                                            backgroundColor: darkMode ? 'rgba(255, 0, 255, 0.3)' : 'rgba(139, 0, 255, 0.3)',
                                        },
                                    }}
                                />
                            }
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {darkMode ? <DarkMode /> : <LightMode />}
                                    {darkMode ? 'Dark' : 'Light'}
                                </Box>
                            }
                        />
                    </Box>

                    {/* Header */}
                    <Box textAlign="center" mb={4}>
                        <Box
                            component="img"
                            src="/images/LyricsRay-logo.png"
                            alt="LyricsRay"
                            sx={{
                                maxWidth: '256px',
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                margin: '0 auto',
                                mb: 2,
                                transition: 'all 0.3s ease-in-out',
                                '&:hover': {
                                transform: 'scale(1.05)',
                                filter: darkMode 
                                    ? 'drop-shadow(0 0 20px rgba(255, 0, 255, 0.5))' 
                                    : 'brightness(1.2) contrast(1.2) drop-shadow(0 4px 15px rgba(139, 0, 255, 0.3))',
                                },
                            }}
                        />
                    </Box>

                    {/* Introduction Card */}
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
                        
                        <Alert 
                            severity="info" 
                            sx={{ 
                                background: darkMode 
                                    ? 'rgba(0, 204, 255, 0.1)' 
                                    : 'rgba(0, 102, 204, 0.1)',
                                border: darkMode 
                                    ? '1px solid rgba(0, 204, 255, 0.3)'
                                    : '1px solid rgba(0, 102, 204, 0.3)',
                            }}
                        >
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
                                        startAdornment: <ChildCare sx={{ color: theme.palette.primary.main, mr: 1 }} />
                                    }}
                                    placeholder="e.g., 12"
                                    required
                                    sx={{ maxWidth: 260 }}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Box>

                            <Divider sx={{ mb: 3, borderColor: darkMode ? 'rgba(255, 0, 255, 0.2)' : 'rgba(139, 0, 255, 0.2)' }} />

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
                                            background: darkMode 
                                                ? 'linear-gradient(90deg, #ff00ff, #00ccff)'
                                                : 'linear-gradient(90deg, #8b00ff, #0066cc)',
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
                                            <Grid size={{xs:12, md:6}}>
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
                                            <Grid size={{xs:12, md:6}}>
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
                            <Box textAlign="center" mt={4}>
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
                            boxShadow: darkMode 
                                ? '0 0 50px rgba(255, 0, 255, 0.3)'
                                : 24,
                            overflow: 'hidden'
                        }}>
                            <Box sx={{ 
                                p: 2, 
                                borderBottom: 1, 
                                borderColor: darkMode ? 'rgba(255, 0, 255, 0.2)' : 'divider', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                background: darkMode 
                                    ? 'linear-gradient(135deg, rgba(255, 0, 255, 0.1), rgba(0, 204, 255, 0.1))'
                                    : 'linear-gradient(135deg, rgba(139, 0, 255, 0.05), rgba(0, 102, 204, 0.05))',
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
                                                        background: darkMode 
                                                            ? 'rgba(255, 0, 255, 0.1)'
                                                            : 'rgba(139, 0, 255, 0.05)',
                                                    },
                                                }}
                                            >
                                                <ListItemAvatar>
                                                    <Avatar 
                                                        src={song.thumbnail} 
                                                        sx={{ 
                                                            bgcolor: darkMode ? 'rgba(255, 0, 255, 0.2)' : theme.palette.primary.light,
                                                            border: darkMode ? '1px solid rgba(255, 0, 255, 0.3)' : 'none',
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
                        <Paper elevation={3} sx={{ p: 4, mt: 4, borderRadius: 3 }}>
                            <Typography variant="h5" fontWeight="600" mb={3}>
                                Analysis Results
                            </Typography>
                            
                            {result.error ? (
                                <Alert 
                                    severity="error"
                                    sx={{
                                        background: darkMode 
                                            ? 'rgba(255, 51, 102, 0.1)'
                                            : 'rgba(204, 0, 51, 0.1)',
                                        border: darkMode 
                                            ? '1px solid rgba(255, 51, 102, 0.3)'
                                            : '1px solid rgba(204, 0, 51, 0.3)',
                                    }}
                                >
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
                                            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                                                {result.analysis}
                                            </Typography>

                                            <Typography variant="body2" color="text.secondary">
                                                <strong>Recommended age:</strong> {result.recommendedAge}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Box>
                            )}
                        </Paper>
                    )}
                </Container>
            </Box>
        </ThemeProvider>
    );
}