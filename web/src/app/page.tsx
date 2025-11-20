'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Tabs,
    Tab,
    Alert,
    CircularProgress,
    Divider,
    Grid,
    Modal,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Link,
} from '@mui/material';
import {
    ChildCare,
    MusicNote,
    Search,
    Note,
    CheckCircle,
    RecordVoiceOver,
    Close,
    Security,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { LYRICS_MAX_LENGTH } from '@/util/defaults';
import { AltchaWidget } from '@/components/AltchaWidget';
import { AppropriatenessCard } from '@/components/AppropriatenessCard';
import { ContainerWithBackground } from '@/components/ContainerWithBackground';

interface FormData {
    childAge: string;
    songName: string;
    songArtist?: string;
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
    recommendedAge: number;
    songKey: string;
    error?: string;
}

const tip1 = `Paste the complete lyrics for the most accurate analysis*`;
const tip2 = `You may submit lyrics in any language!`;

const noteLyricsMaxLen = `* Keep in mind that the maximum allowed length of lyrics to analyze
is ${LYRICS_MAX_LENGTH} characters. If your lyrics are longer, consider
submitting only part of the lyrics.`;

const emptyFormData: FormData = {
    childAge: '',
    songName: '',
    songArtist: '',
    lyrics: '',
    inputMethod: 'search'
};

export default function Home() {
    const theme = useTheme();
    
    const [formData, setFormData] = useState<FormData>(emptyFormData);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchResults, setSearchResults] = useState<SongSearchResult[]>([]);
    const [selectedSong, setSelectedSong] = useState<SongSearchResult | null>(null);
    const [showSongModal, setShowSongModal] = useState<boolean>(false);
    const [showLyricsModal, setShowLyricsModal] = useState<boolean>(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    
    // ALTCHA state
    const [altchaPayload, setAltchaPayload] = useState<string>('');
    const [altchaChallenge, setAltchaChallenge] = useState<any>(null);
    const [altchaVerified, setAltchaVerified] = useState<boolean>(false);

    // Load ALTCHA challenge on component mount
    useEffect(() => {
        loadAltchaChallenge();
    }, []);

    const loadAltchaChallenge = async () => {
        try {
            const response = await fetch('/api/altcha/challenge');
            const challenge = await response.json();
            setAltchaChallenge(challenge);
        } catch (error) {
            console.error('Failed to load ALTCHA challenge:', error);
        }
    };

    const handleAltchaStateChange = (event: any) => {
        if (event.detail.state === 'verified') {
            setAltchaPayload(event.detail.payload);
            setAltchaVerified(true);
        } else if (event.detail.state === 'unverified') {
            setAltchaPayload('');
            setAltchaVerified(false);
        }
    };

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
        setSelectedSong(null);
        setIsSearching(true);
        try {
            const response = await fetch('/api/search-song', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    songName: formData.songName,
                    artist: formData.songArtist,
                    altchaPayload,
                }),
            });

            const data = await response.json();
            
            if (data.error) {
                setResult({
                    appropriate: 0,
                    analysis: '',
                    recommendedAge: 0,
                    songKey: '',
                    error: data.error
                });
                return;
            }

            if (data.songs && data.songs.length > 0) {
                setSearchResults(data.songs);
                if (data.songs.length === 1) {
                    // If only one result, proceed directly to analysis
                    analyzeLyricsDirectly(data.songs[0]);
                } else {
                    // Show modal for multiple results
                    setShowSongModal(true);
                }
            } else {
                setResult({
                    appropriate: 0,
                    analysis: '',
                    recommendedAge: 0,
                    songKey: '',
                    error: 'No songs found. Please try different search terms or paste lyrics directly.'
                });
            }
        } catch (error) {
            console.error('Error searching songs:', error);
            setResult({
                appropriate: 0,
                analysis: '',
                recommendedAge: 0,
                songKey: '',
                error: 'Failed to search songs. Please try again.'
            });
        } finally {
            setIsSearching(false);
        }
    };

    const analyzeLyricsDirectly = async (song: SongSearchResult) => {
        setIsLoading(true);
        setShowSongModal(false);
        
        try {
            const response = await fetch('/api/analyze-song', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    childAge: parseInt(formData.childAge),
                    lyrics: song.lyrics,
                    inputMethod: 'lyrics',
                    altchaPayload,
                    songName: song.title,
                    artistName: song.artist,
                    albumName: song.album,
                }),
            });

            const data: AnalysisResult = await response.json();
            setResult(data);

            setTimeout(() => {
                const element = document.getElementById('analyze-results-wrapper');
                if (element)
                    element.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        } catch (error) {
            console.error('Error analyzing lyrics:', error);
            setResult({
                appropriate: 0,
                analysis: '',
                recommendedAge: 0,
                songKey: '',
                error: 'Failed to analyze lyrics. Please try again.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setResult(null); // Clear previous results

        // Check ALTCHA verification first
        if (!altchaVerified) {
            setResult({
                appropriate: 0,
                analysis: '',
                recommendedAge: 0,
                songKey: '',
                error: 'Please complete the human verification first.'
            });
            return;
        }
        
        if (formData.inputMethod === 'search') {
            await searchSongs();
        } else {
            const _selectedSong: SongSearchResult = {
                id: "unknown",
                lyrics: formData.lyrics,
                artist: "Unknown artist",
                title: "Unknown song",
            };
            setSelectedSong(_selectedSong);
            await analyzeLyricsDirectly(_selectedSong);

            resetAltcha();
        }
    };

    const handleSongSelect = (song: SongSearchResult) => {
        setSelectedSong(song);
        analyzeLyricsDirectly(song);
    };

    const handleCloseModal = () => {
        setShowSongModal(false);
        setSearchResults([]);
    };

    const handleShowLyricsModal = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        setShowLyricsModal(true);
        e.preventDefault();
        return false;
    }

    const handleTryAgainButton = () => {
        setResult(null);
        resetForm();
        resetAltcha();
        setSelectedSong(null);
        setSearchResults([]);
    };

    const resetAltcha = () => {
        // Reset ALTCHA
        setAltchaVerified(false);
        setAltchaPayload('');

        // Loads a new challenge
        loadAltchaChallenge();
    }

    const resetForm = () => {
        setFormData(emptyFormData);
    };

    const isFormValid = formData.childAge && (
        (formData.inputMethod === 'search' && formData.songName.trim()) ||
        (formData.inputMethod === 'lyrics' && formData.lyrics.trim())
    ) && altchaVerified;

    return (
        <Box sx={{ position: 'relative', minHeight: '100vh' }}>
            {/* Main Content */}
            <ContainerWithBackground>

                {/* Introduction and Form Card */}
                <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>                        
                    {/* <Typography variant="body1" color="text.secondary" component="p" sx={{ mb: 2 }}>
                        LyricsRay helps you determine whether a song is appropriate for your child 
                        based on its lyrics content. Using advanced AI analysis, we evaluate songs for explicit 
                        language, mature themes, and age-appropriate content.
                    </Typography> */}
                    
                    <Typography variant="body1" color="text.secondary" component="p" sx={{ mb: 3 }}>
                        Choose to search for a song by title and artist, or paste lyrics directly if you already have them. 
                        We will analyze the content and provide you with a detailed assessment and age recommendation.
                    </Typography>

                    {!result && (
                        <Box id="analyze-form-wrapper">
                            <Typography variant="h5" fontWeight="600" mb={3}>
                                Analyze a Song
                            </Typography>
                            
                            <Typography variant="body1" color="text.secondary" component="p" sx={{ mb: 3 }}>
                                <strong>Two ways to analyze:</strong> Search the database or paste any lyrics directly 
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
                                        slotProps={{
                                            htmlInput: { min: 1, max: 21 },
                                            input: {
                                                startAdornment: <ChildCare sx={{ color: theme.palette.primary.main, mr: 1 }} />
                                            },
                                            inputLabel: { shrink: true }
                                        }}
                                        placeholder="e.g., 12"
                                        required
                                        sx={{ maxWidth: 260 }}
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
                                            <Box>
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
                                                            slotProps={{
                                                                input: {
                                                                    startAdornment: <MusicNote sx={{ color: theme.palette.primary.main, mr: 1 }} />
                                                                }
                                                            }}
                                                        />
                                                    </Grid>
                                                    <Grid size={{ xs:12, md: 6 }}>
                                                        <TextField
                                                            name="songArtist"
                                                            label="Artist Name (Optional)"
                                                            value={formData.songArtist}
                                                            onChange={handleInputChange}
                                                            placeholder="e.g., Pharrell Williams"
                                                            required={false}
                                                            fullWidth
                                                            slotProps={{
                                                                input: {
                                                                    startAdornment: <RecordVoiceOver sx={{ color: theme.palette.primary.main, mr: 1 }} />
                                                                }
                                                            }}
                                                        />
                                                    </Grid>
                                                </Grid>
                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                    💡 Tip: {tip2}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Box>
                                                <TextField
                                                    name="lyrics"
                                                    label="Song Lyrics"
                                                    value={formData.lyrics}
                                                    onChange={handleInputChange}
                                                    multiline
                                                    rows={8}
                                                    slotProps={{
                                                        htmlInput: { maxLength: LYRICS_MAX_LENGTH }
                                                    }}
                                                    placeholder="Paste the complete song lyrics here..."
                                                    required={formData.inputMethod === 'lyrics'}
                                                    fullWidth
                                                />
                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                    💡 Tip #1: {tip1}
                                                    <br />
                                                    💡 Tip #2: {tip2}
                                                    <br />
                                                    &nbsp;&nbsp;
                                                    <i>{noteLyricsMaxLen}</i>
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>

                                {/* ALTCHA Human Verification */}
                                <Box sx={{ my: 4 }}>                            
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Security sx={{ color: theme.palette.primary.main }} />
                                        <Typography variant="h6" fontWeight="600">
                                            Human Verification
                                        </Typography>
                                        {altchaVerified && (
                                            <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                                        )}
                                    </Box>
                                    
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Complete this quick verification to prevent automated abuse of our AI analysis service.
                                    </Typography>

                                    {/* ALTCHA Widget Container */}
                                    {altchaChallenge && (
                                        <AltchaWidget
                                            challengeurl="/api/altcha/challenge"
                                            style={{
                                                '--altcha-color-base': theme.palette.background.paper,
                                                '--altcha-color-text': theme.palette.text.primary,
                                                '--altcha-border-radius': '8px',
                                            }}
                                            onstatechange={handleAltchaStateChange}
                                        />
                                    )}
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
                                    
                                    {!altchaVerified && (
                                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                            Please complete human verification above
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Box>)}

                    {result && (
                        <Box id="analyze-results-wrapper">
                            <Typography variant="h5" fontWeight="600" mb={3}>
                                Analysis results for lyrics
                            </Typography>
                            
                            {result.error ? (
                                <>
                                    <Alert 
                                        severity="error"
                                        sx={{
                                            background: 'rgba(255, 51, 102, 0.1)',
                                            border: '1px solid rgba(255, 51, 102, 0.3)',
                                        }}
                                    >
                                        {result.error}
                                    </Alert>

                                    {/* Try again Button */}
                                    <Box textAlign="center" mt={4} className="submit-wrapper">
                                        <Button
                                            type="button"
                                            variant="contained"
                                            size="large"
                                            sx={{ px: 4, py: 1.5 }}
                                            onClick={() => handleTryAgainButton()}
                                        >
                                            Try again
                                        </Button>
                                    </Box>
                                </>
                            ) : (
                                <Box>
                                    {selectedSong && (
                                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                                            <strong>{selectedSong.title || "Unknown song"}</strong>&nbsp; 
                                            by <strong>{selectedSong.artist || "Unknown artist"}</strong>
                                            <br />
                                            Lyrics: <i>{selectedSong.lyrics.substring(0, 60)}&hellip;</i>&nbsp;
                                            <Link href="#" onClick={(e) => handleShowLyricsModal(e)}>Show full lyrics</Link>
                                        </Typography>
                                    )}

                                    {/* Analysis results card */}
                                    <AppropriatenessCard 
                                        appropriate={result.appropriate}
                                        recommendedAge={result.recommendedAge}
                                        showShareButton={true}
                                        songKey={result.songKey}
                                        songTitle={selectedSong?.title || 'Unknown Song'}
                                        artistName={selectedSong?.artist || 'Unknown Artist'}
                                    />
                                    
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
                                        Remember: You know your child best. Use LyricsRay as a tool to inform your 
                                        decisions, but always trust your parental instincts and family values when 
                                        determining what&apos;s right for your children.
                                    </Typography>

                                    {/* Analyze another song button */}
                                    <Box textAlign="center" mt={4} className="submit-wrapper">
                                        <Button
                                            type="button"
                                            variant="contained"
                                            size="large"
                                            sx={{ px: 4, py: 1.5 }}
                                            onClick={() => handleTryAgainButton()}
                                        >
                                            Analyze another song
                                        </Button>
                                    </Box>
                                </Box>
                            )}
                        </Box>)}
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
                            <Button variant="contained" onClick={handleCloseModal} size="small" sx={{ minWidth: 'auto', p: 1 }}>
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

                {/* Lyrics Modal */}
                {selectedSong && (
                    <Modal open={showLyricsModal} onClose={() => setShowLyricsModal(false)}>
                        <Box sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: { xs: '90%', sm: 500, md: 800 },
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
                                    {selectedSong.title || "Unknown song"} by {selectedSong.artist || "Unknown artist"}
                                </Typography>
                                <Button variant="contained" onClick={() => setShowLyricsModal(false)} size="small" sx={{ minWidth: 'auto', p: 1 }}>
                                    <Close />
                                </Button>
                            </Box>
                            <Box sx={{ maxHeight: 500, maxWidth: 800, overflow: 'auto', p: 2 }}>
                                <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace', mb: 2 }}
                                >
                                    {selectedSong.lyrics || "No lyrics to show :("}
                                </Typography>
                            </Box>
                        </Box>
                    </Modal>)}
            </ContainerWithBackground>
        </Box>
    );
}
