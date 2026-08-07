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
import MusicNote from '@mui/icons-material/MusicNote';
import Search from '@mui/icons-material/Search';
import Note from '@mui/icons-material/Note';
import CheckCircle from '@mui/icons-material/CheckCircle';
import RecordVoiceOver from '@mui/icons-material/RecordVoiceOver';
import Close from '@mui/icons-material/Close';
import Security from '@mui/icons-material/Security';
import HourglassTop from '@mui/icons-material/HourglassTop';
import { useTheme } from '@mui/material/styles';
import { AltchaWidget } from '@/components/AltchaWidget';
import { AppropriatenessCard } from '@/components/AppropriatenessCard';
import { LoadingAnalysisModal } from '@/components/LoadingAnalysisModal';
import { LyricsModal } from '@/components/LyricsModal';
import { SupportPromptBanner } from '@/components/SupportPromptBanner';
import { clearCachedAltcha, getCachedAltcha, setCachedAltcha } from '@/util/altchaClient';
import { LYRICS_MAX_LENGTH } from '@/util/defaults';
import { KO_FI_LINK } from '@/util/supportDev';
import { trackEvent } from '@/util/trackEvent';
import { clearRateLimitedUntil, formatRemainingTime, getRateLimitedUntil, setRateLimitedUntil } from '@/util/rateLimitClient';
import { incrementAnalysisCount, shouldShowSupportPrompt, dismissSupportPrompt } from '@/util/analysisCountClient';
import { encodeSongKeyForPath } from '@/util/routeHelper';
import { LyricsThemes } from './LyricsThemes';

const DEFAULT_RATE_LIMIT_RETRY_SECONDS = 3600;
const FRIENDLY_SERVER_ERROR_MESSAGE = "Something went wrong on our end. Please try again in a little while.";

interface FormData {
    songName: string;
    songArtist?: string;
    lyrics: string;
    inputMethod: 'search' | 'lyrics';
}

interface SongSearchResult {
    id: string;
    artist?: string;
    album?: string;
    lyrics: string;
    thumbnail?: string;
    title?: string;
}

interface AnalysisResult {
    appropriate: number;
    analysis: string;
    recommendedAge: number;
    songKey: string;
    themes: string[];
    error?: string;
    // 'validation' errors (bad input, failed human verification) show the server's
    // specific message; 'server' errors (500s, network failures) show a generic,
    // friendlier message instead of exposing backend error details.
    errorKind?: 'validation' | 'server';
}

const tip1 = `Paste the complete lyrics for the most accurate analysis*`;
const tip2 = `You may submit lyrics in any language!`;

const noteLyricsMaxLen = `* Keep in mind that the maximum allowed length of lyrics to analyze
is ${LYRICS_MAX_LENGTH} characters. If your lyrics are longer, consider
submitting only part of the lyrics.`;

const emptyFormData: FormData = {
    songName: '',
    songArtist: '',
    lyrics: '',
    inputMethod: 'search'
};

export function LyricsAnalysisForm() {
    const theme = useTheme();

    const [formData, setFormData] = useState<FormData>(emptyFormData);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchResults, setSearchResults] = useState<SongSearchResult[]>([]);
    const [selectedSong, setSelectedSong] = useState<SongSearchResult | null>(null);
    const [showSongModal, setShowSongModal] = useState<boolean>(false);
    const [showLyricsModal, setShowLyricsModal] = useState<boolean>(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [analysisCount, setAnalysisCount] = useState(0);
    const [promptEligible, setPromptEligible] = useState(false);

    // ALTCHA state
    const [altchaPayload, setAltchaPayload] = useState<string>('');
    const [altchaChallenge, setAltchaChallenge] = useState<any>(null);
    const [altchaVerified, setAltchaVerified] = useState<boolean>(false);

    // Rate-limit cooldown state. rateLimitedUntil is an absolute timestamp persisted to
    // sessionStorage (see @/util/rateLimitClient) so a page refresh mid-cooldown still shows
    // the wait message instead of an empty form inviting an immediate resubmit that the
    // server would just reject again. `now` ticks every second while a cooldown is active to
    // drive the live countdown; the server's rate limiter remains the actual source of truth.
    const [rateLimitedUntil, setRateLimitedUntilState] = useState<number | null>(null);
    const [now, setNow] = useState<number>(() => Date.now());

    const remainingCooldownSeconds = rateLimitedUntil ? Math.max(0, Math.ceil((rateLimitedUntil - now) / 1000)) : 0;
    const isRateLimited = remainingCooldownSeconds > 0;

    // Restore any cooldown still active from a previous page load in this session
    useEffect(() => {
        const until = getRateLimitedUntil();
        if (until) {
            setRateLimitedUntilState(until);
            setNow(Date.now());
        }
    }, []);

    // Tick the countdown once per second while a cooldown is active
    useEffect(() => {
        if (!rateLimitedUntil) return;

        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [rateLimitedUntil]);

    // Clear the cooldown (state + storage) once it elapses
    useEffect(() => {
        if (rateLimitedUntil && remainingCooldownSeconds === 0) {
            clearRateLimitedUntil();
            setRateLimitedUntilState(null);
        }
    }, [remainingCooldownSeconds, rateLimitedUntil]);

    // Load ALTCHA challenge on component mount
    useEffect(() => {
        const cached = getCachedAltcha();
        if (cached) {
            setAltchaPayload(cached);
            setAltchaVerified(true);
        } else {
            loadAltchaChallenge();
        }
    }, []);

    // Continously keep checking altcha expiration
    useEffect(() => {
        if (!altchaVerified) return;

        const interval = setInterval(() => {
            const cached = getCachedAltcha();

            if (!cached) {
                // Expired → reset + reload challenge
                setAltchaVerified(false);
                setAltchaPayload('');
                loadAltchaChallenge();
            }
        }, 10 * 1000); // check every 10s

        return () => clearInterval(interval);
    }, [altchaVerified]);

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
            setCachedAltcha(event.detail.payload);
        } else if (event.detail.state === 'unverified') {
            setAltchaPayload('');
            setAltchaVerified(false);
            clearCachedAltcha();
        } else if (event.detail.state === 'expired') {
            clearCachedAltcha();
            setAltchaPayload('');
            setAltchaVerified(false);
            loadAltchaChallenge();
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
                    themes: [],
                    error: data.error
                });

                // Only reset Altcha if the error is verification-related
                if (data.error.includes('Human verification') || data.error.includes('verification failed')) {
                    resetAltcha();
                }
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
                    themes: [],
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
                themes: [],
                error: 'Failed to search songs. Please try again.'
            });
        } finally {
            setIsSearching(false);
        }
    };

    const scrollToResults = () => {
        setTimeout(() => {
            const element = document.getElementById('analyze-results-wrapper');
            if (element)
                element.scrollIntoView({ behavior: 'smooth' });
        }, 500);
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
                    lyrics: song.lyrics,
                    inputMethod: 'lyrics',
                    altchaPayload,
                    songName: song.title,
                    artistName: song.artist,
                    albumName: song.album,
                }),
            });

            const data = await response.json();

            if (response.status === 429) {
                const retryAfterSeconds = typeof data.retryAfter === 'number' ? data.retryAfter : DEFAULT_RATE_LIMIT_RETRY_SECONDS;
                const until = setRateLimitedUntil(retryAfterSeconds);
                setRateLimitedUntilState(until);
                setNow(Date.now());
                return;
            }

            if (!response.ok) {
                const isServerError = response.status >= 500;

                // Check if there was a verification error
                if (!isServerError && data.error && (data.error.includes('Human verification') || data.error.includes('verification failed'))) {
                    resetAltcha();
                }

                setResult({
                    appropriate: 0,
                    analysis: '',
                    recommendedAge: 0,
                    songKey: '',
                    themes: [],
                    error: isServerError ? FRIENDLY_SERVER_ERROR_MESSAGE : data.error,
                    errorKind: isServerError ? 'server' : 'validation',
                });
                scrollToResults();
                return;
            }

            setResult(data);
            const count = incrementAnalysisCount();
            setAnalysisCount(count);
            setPromptEligible(shouldShowSupportPrompt(count));
            scrollToResults();
        } catch (error) {
            console.error('Error analyzing lyrics:', error);
            setResult({
                appropriate: 0,
                analysis: '',
                recommendedAge: 0,
                songKey: '',
                themes: [],
                error: FRIENDLY_SERVER_ERROR_MESSAGE,
                errorKind: 'server',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isRateLimited) return; // the form isn't shown during a cooldown, but guard defensively
        setResult(null); // Clear previous results

        // Check ALTCHA verification first
        if (!altchaVerified) {
            setResult({
                appropriate: 0,
                analysis: '',
                recommendedAge: 0,
                songKey: '',
                themes: [],
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
            };
            setSelectedSong(_selectedSong);
            await analyzeLyricsDirectly(_selectedSong);
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
        setSelectedSong(null);
        setSearchResults([]);
        // Keep Altcha verification - don't reset unless it has expired
    };

    const handleDismissPrompt = () => {
        dismissSupportPrompt(analysisCount);
        setPromptEligible(false);
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

    const isFormValid = (
        (formData.inputMethod === 'search' && formData.songName.trim()) ||
        (formData.inputMethod === 'lyrics' && formData.lyrics.trim())
    ) && altchaVerified;

    return (
        <>
            <LoadingAnalysisModal
                open={isSearching || isLoading}
                type={isSearching ? 'searching' : 'analyzing'}
            />

            {/* Introduction and Form Card */}
            <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
                <Typography variant="body1" color="text.secondary" component="p" sx={{ mb: 3 }}>
                    Choose to search for a song by title and artist, or paste lyrics directly if you already have them.
                    We will analyze the content and provide you with a detailed assessment and age recommendation.
                </Typography>

                {isRateLimited && (
                    <Box id="analyze-form-wrapper" sx={{ scrollMarginTop: 180 }}>
                        <Alert
                            severity="info"
                            icon={<HourglassTop />}
                            sx={{
                                background: 'rgba(0, 204, 255, 0.08)',
                                border: '1px solid rgba(0, 204, 255, 0.25)',
                            }}
                        >
                            <Typography variant="body1" fontWeight="600" sx={{ mb: 0.5 }}>
                                We&apos;re taking a quick breather!
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                We&apos;ve hit our limit for new analyses right now. Please check back
                                in about {formatRemainingTime(remainingCooldownSeconds)}.
                            </Typography>
                        </Alert>
                    </Box>
                )}

                {!result && !isRateLimited && (
                    <Box id="analyze-form-wrapper" sx={{ scrollMarginTop: 180 }}>
                        <Typography variant="h5" fontWeight="600" mb={3}>
                            Analyze a Song
                        </Typography>

                        <Typography variant="body1" color="text.secondary" component="p" sx={{ mb: 3 }}>
                            <strong>Two ways to analyze:</strong> Search the database or paste any lyrics directly
                            for instant analysis.
                        </Typography>

                        {/* Form */}
                        <Box component="form" onSubmit={handleSubmit}>
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
                                            height: 5,
                                        },
                                    }}
                                    variant="fullWidth"
                                >
                                    <Tab
                                        value="search"
                                        label="Search by Song"
                                        icon={<Search />}
                                        iconPosition="start"
                                    />
                                    <Tab
                                        value="lyrics"
                                        label="Paste Lyrics"
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

                                {/* ALTCHA Widget Container */}
                                {altchaChallenge && !altchaVerified && (
                                    <>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Complete this quick verification to prevent automated abuse of our AI analysis service.
                                        </Typography>

                                        <AltchaWidget
                                            challengeurl="/api/altcha/challenge"
                                            style={{
                                                '--altcha-color-base': theme.palette.background.paper,
                                                '--altcha-color-text': theme.palette.text.primary,
                                                '--altcha-border-radius': '8px',
                                            }}
                                            onstatechange={handleAltchaStateChange}
                                        />
                                    </>
                                )}
                                {altchaVerified && (
                                    <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircle fontSize="small" /> Verification complete
                                    </Typography>
                                )}

                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 2 }}>
                                    By submitting the search request, you agree to
                                    our <Link href="/privacy-and-terms">Privacy Policy & Terms of Service</Link>.
                                </Typography>
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
                    </Box>
                )}

                {result && (
                    <Box id="analyze-results-wrapper">
                        <Typography variant="h5" fontWeight="600" mb={3}>
                            Analysis results for lyrics
                        </Typography>

                        {result.error ? (
                            <>
                                {result.errorKind === 'server' ? (
                                    <Alert
                                        severity="info"
                                        icon={<HourglassTop />}
                                        sx={{
                                            background: 'rgba(0, 204, 255, 0.08)',
                                            border: '1px solid rgba(0, 204, 255, 0.25)',
                                        }}
                                    >
                                        {result.error}
                                    </Alert>
                                ) : (
                                    <Alert
                                        severity="error"
                                        sx={{
                                            background: 'rgba(255, 51, 102, 0.1)',
                                            border: '1px solid rgba(255, 51, 102, 0.3)',
                                        }}
                                    >
                                        {result.error}
                                    </Alert>
                                )}

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
                                        {selectedSong.title || selectedSong.artist ? (
                                            <>
                                                <strong>{selectedSong.title || "Unknown song"}</strong>&nbsp;
                                                by <strong>{selectedSong.artist || "Unknown artist"}</strong>
                                                <br />
                                            </>
                                        ) : <></>}
                                        {result?.appropriate === 3 ? (
                                            <>This song&apos;s lyrics contain mature content.&nbsp;</>
                                        ) : (
                                            <>Lyrics: <i>{selectedSong.lyrics.substring(0, 60)}&hellip;</i>&nbsp;</>
                                        )}
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

                                {promptEligible && <SupportPromptBanner onDismiss={handleDismissPrompt} />}

                                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                                    {result.analysis}
                                </Typography>
                                
                                <Typography variant="h6" fontWeight="600" mb={2}>
                                    Themes
                                </Typography>
                                <LyricsThemes themes={result.themes} />

                                <Typography variant="body1" color="text.secondary" sx={{ mb: 2, mt: 2 }}>
                                    <Link href={`/analysis/${encodeSongKeyForPath(result.songKey)}`}>
                                        <strong>Analysis details &raquo;</strong>
                                    </Link>
                                </Typography>

                                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                                    <Link href="/about">
                                        <strong>Read more about this analysis and how we do it &raquo;</strong>
                                    </Link>
                                </Typography>

                                <Divider sx={{ my: 3, borderColor: 'rgba(255, 0, 255, 0.3)' }} />

                                <Typography variant="h6" mb={3} sx={{ fontWeight: 600 }}>
                                    Remember: You know your child best. Use LyricsRay as a tool to inform your
                                    decisions, but always trust your parental instincts and family values when
                                    determining what&apos;s right for your children.
                                </Typography>

                                {!promptEligible && (
                                    <>
                                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                            Did this analysis help you?
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary">
                                            If so, consider supporting the project to cover some of the development and
                                            hosting costs ❤️
                                        </Typography>
                                    </>
                                )}

                                {/* Analyze another song button */}
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }} mt={4} className="submit-wrapper">
                                    {!promptEligible && (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            size="large"
                                            sx={{ px: 4, py: 1.5 }}
                                            onClick={() => {
                                                trackEvent('externalLink', { linkTarget: 'kofi-profile', linkContext: 'analysisForm' });
                                                window.open(KO_FI_LINK, '_blank', 'noopener,noreferrer');
                                            }}
                                        >
                                            ☕ Support on Ko-fi
                                        </Button>
                                    )}
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
                <LyricsModal
                    open={showLyricsModal}
                    onClose={() => setShowLyricsModal(false)}
                    title={selectedSong.title}
                    artist={selectedSong.artist}
                    lyrics={selectedSong.lyrics}
                    isMature={result?.appropriate === 3}
                />
            )}
        </>
    );
}