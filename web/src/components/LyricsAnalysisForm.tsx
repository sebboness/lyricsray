'use client';

import { useState, ChangeEvent, FormEvent, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    ToggleButtonGroup,
    ToggleButton,
    Alert,
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
import Search from '@mui/icons-material/Search';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Close from '@mui/icons-material/Close';
import MusicNote from '@mui/icons-material/MusicNote';
import HourglassTop from '@mui/icons-material/HourglassTop';
import { AltchaWidget } from '@/components/AltchaWidget';
import { AnalyzingPanel, AnalyzeStep, AnalyzeStepId } from '@/components/AnalyzingPanel';
import { AppropriatenessCard } from '@/components/AppropriatenessCard';
import { EyebrowLabel } from '@/components/EyebrowLabel';
import { LyricsModal } from '@/components/LyricsModal';
import { SupportPromptBanner } from '@/components/SupportPromptBanner';
import { clearCachedAltcha, getCachedAltcha, setCachedAltcha } from '@/util/altchaClient';
import { LYRICS_MAX_LENGTH } from '@/util/defaults';
import { KO_FI_LINK } from '@/util/supportDev';
import { trackEvent } from '@/util/trackEvent';
import { clearRateLimitedUntil, formatRemainingTime, getRateLimitedUntil, setRateLimitedUntil } from '@/util/rateLimitClient';
import { incrementAnalysisCount, shouldShowSupportPrompt, dismissSupportPrompt } from '@/util/analysisCountClient';
import { encodeSongKeyForPath } from '@/util/routeHelper';
import { ThemeBreakdown } from '@/components/ThemeBreakdown';

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
    summary?: string;
    themePercentages?: { theme: string; percentage: number }[];
    error?: string;
    // 'validation' errors (bad input, failed human verification) show the server's
    // specific message; 'server' errors (500s, network failures) show a generic,
    // friendlier message instead of exposing backend error details.
    errorKind?: 'validation' | 'server';
}

const emptyFormData: FormData = {
    songName: '',
    songArtist: '',
    lyrics: '',
    inputMethod: 'search'
};

// The "checking themes"/"setting an age" steps aren't backed by discrete API
// calls — they're timed placeholders that advance partway through the
// analyze request, then snap to done as soon as the real response arrives.
const STEP_LABELS: Record<AnalyzeStepId, string> = {
    'searching-song': 'Searching for song',
    'lyrics-found': 'Lyrics found',
    'checking-themes': 'Checking themes and context',
    'setting-age': 'Setting an age',
};

const TIMED_STEP_ADVANCE_MS = 2200;

const buildSearchPhaseSteps = (): AnalyzeStep[] => [
    { id: 'searching-song', label: STEP_LABELS['searching-song'], status: 'active' as const },
    { id: 'lyrics-found', label: STEP_LABELS['lyrics-found'], status: 'pending' as const },
    { id: 'checking-themes', label: STEP_LABELS['checking-themes'], status: 'pending' as const },
    { id: 'setting-age', label: STEP_LABELS['setting-age'], status: 'pending' as const },
];

const buildAnalyzePhaseSteps = (includeSearchStep: boolean): AnalyzeStep[] => [
    ...(includeSearchStep
        ? [{ id: 'searching-song' as const, label: STEP_LABELS['searching-song'], status: 'done' as const }]
        : []),
    { id: 'lyrics-found', label: STEP_LABELS['lyrics-found'], status: 'done' as const },
    { id: 'checking-themes', label: STEP_LABELS['checking-themes'], status: 'active' as const },
    { id: 'setting-age', label: STEP_LABELS['setting-age'], status: 'pending' as const },
];

const advanceTimedSteps = (steps: AnalyzeStep[]): AnalyzeStep[] =>
    steps.map((step): AnalyzeStep => {
        if (step.id === 'checking-themes' && step.status !== 'done') return { ...step, status: 'done' as const };
        if (step.id === 'setting-age' && step.status !== 'done') return { ...step, status: 'active' as const };
        return step;
    });

export function LyricsAnalysisForm() {
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

    // Drives the AnalyzingPanel step checklist. See buildSearchPhaseSteps/
    // buildAnalyzePhaseSteps/advanceTimedSteps above.
    const [analyzeSteps, setAnalyzeSteps] = useState<AnalyzeStep[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);
    const stepTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearStepTimers = () => {
        stepTimersRef.current.forEach(clearTimeout);
        stepTimersRef.current = [];
    };

    // Clear any pending step timers if the form unmounts mid-analysis
    useEffect(() => () => clearStepTimers(), []);

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

    const handleTabChange = (newValue: 'search' | 'lyrics' | null) => {
        if (!newValue) return;

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
        clearStepTimers();
        setAnalyzeSteps(buildSearchPhaseSteps());

        const controller = new AbortController();
        abortControllerRef.current = controller;

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
                signal: controller.signal,
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
            if ((error as { name?: string })?.name === 'AbortError') return; // user cancelled

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

    const analyzeLyricsDirectly = async (song: SongSearchResult) => {
        setIsLoading(true);
        setShowSongModal(false);
        clearStepTimers();
        setAnalyzeSteps(buildAnalyzePhaseSteps(formData.inputMethod === 'search'));
        stepTimersRef.current.push(
            setTimeout(() => setAnalyzeSteps((prev) => advanceTimedSteps(prev)), TIMED_STEP_ADVANCE_MS)
        );

        const controller = new AbortController();
        abortControllerRef.current = controller;

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
                signal: controller.signal,
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
                return;
            }

            setResult(data);
            const count = incrementAnalysisCount();
            setAnalysisCount(count);
            setPromptEligible(shouldShowSupportPrompt(count));
        } catch (error) {
            if ((error as { name?: string })?.name === 'AbortError') return; // user cancelled

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
            clearStepTimers();
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

    const handleCancelAnalyzing = () => {
        abortControllerRef.current?.abort();
        clearStepTimers();
        setIsSearching(false);
        setIsLoading(false);
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

    const isAnalyzing = isSearching || isLoading;
    const analyzingSongName = selectedSong?.title || formData.songName || 'Your lyrics';
    const analyzingArtistName = selectedSong?.artist || formData.songArtist || undefined;

    return (
        <>
            {/* Introduction and Form Card */}
            <Paper sx={{ p: { xs: 3, sm: 4 } }}>
                {isAnalyzing ? (
                    <AnalyzingPanel
                        songName={analyzingSongName}
                        artistName={analyzingArtistName}
                        steps={analyzeSteps}
                        onCancel={handleCancelAnalyzing}
                    />
                ) : (
                <>
                {isRateLimited && (
                    <Box id="analyze-form-wrapper" sx={{ scrollMarginTop: 180 }}>
                        <Alert severity="info" icon={<HourglassTop />}>
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
                        {/* Form */}
                        <Box component="form" onSubmit={handleSubmit}>
                            <ToggleButtonGroup
                                exclusive
                                fullWidth
                                value={formData.inputMethod}
                                onChange={(_, value) => handleTabChange(value)}
                                sx={{ mb: 3 }}
                            >
                                <ToggleButton value="search">Search a song</ToggleButton>
                                <ToggleButton value="lyrics">Paste lyrics</ToggleButton>
                            </ToggleButtonGroup>

                            {/* Tab Content */}
                            <Box sx={{ minHeight: 200 }}>
                                {formData.inputMethod === 'search' ? (
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                                name="songName"
                                                label="Song"
                                                value={formData.songName}
                                                onChange={handleInputChange}
                                                placeholder="e.g., Happy"
                                                required={formData.inputMethod === 'search'}
                                                fullWidth
                                                slotProps={{ inputLabel: { shrink: true } }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                                name="songArtist"
                                                label="Artist, optional"
                                                value={formData.songArtist}
                                                onChange={handleInputChange}
                                                placeholder="e.g., Pharrell Williams"
                                                required={false}
                                                fullWidth
                                                slotProps={{ inputLabel: { shrink: true } }}
                                            />
                                        </Grid>
                                    </Grid>
                                ) : (
                                    <Box>
                                        <TextField
                                            name="lyrics"
                                            label="Song lyrics"
                                            value={formData.lyrics}
                                            onChange={handleInputChange}
                                            multiline
                                            rows={8}
                                            slotProps={{
                                                htmlInput: { maxLength: LYRICS_MAX_LENGTH },
                                                inputLabel: { shrink: true },
                                            }}
                                            placeholder="Paste the complete song lyrics here..."
                                            required={formData.inputMethod === 'lyrics'}
                                            fullWidth
                                        />
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            Up to {LYRICS_MAX_LENGTH} characters.
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* ALTCHA Human Verification */}
                            <Box sx={{ mt: 3 }}>
                                {altchaChallenge && !altchaVerified && (
                                    <AltchaWidget
                                        challengeurl="/api/altcha/challenge"
                                        style={{
                                            '--altcha-color-base': 'transparent',
                                            '--altcha-color-text': '#eef1f4',
                                            '--altcha-border-radius': '11px',
                                        }}
                                        onstatechange={handleAltchaStateChange}
                                    />
                                )}
                                {altchaVerified && (
                                    <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircle fontSize="small" /> Verification complete
                                    </Typography>
                                )}

                                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                    By submitting the search request, you agree to
                                    our <Link href="/privacy-and-terms">Privacy Policy &amp; Terms of Service</Link>.
                                </Typography>
                            </Box>

                            {/* Submit Button */}
                            <Box textAlign="center" mt={4} className="submit-wrapper">
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                    disabled={!isFormValid}
                                    startIcon={<Search />}
                                >
                                    Analyze
                                </Button>

                                {!altchaVerified ? (
                                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                        Please complete human verification above
                                    </Typography>
                                ) : (
                                    <EyebrowLabel sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
                                        Any language · No account needed
                                    </EyebrowLabel>
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
                                    <Alert severity="info" icon={<HourglassTop />}>
                                        {result.error}
                                    </Alert>
                                ) : (
                                    <Alert severity="error">
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
                                    summary={result.summary}
                                />

                                {promptEligible && <SupportPromptBanner onDismiss={handleDismissPrompt} />}

                                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                                    {result.analysis}
                                </Typography>

                                <Typography variant="h6" fontWeight="600" mb={2}>
                                    Themes
                                </Typography>
                                <ThemeBreakdown themes={result.themes} themePercentages={result.themePercentages} />

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

                                <Divider sx={{ my: 3 }} />

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
                </>
                )}
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
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden'
                }}>
                    <Box sx={{
                        p: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <Typography variant="h6" component="h2">
                            Select the Correct Song
                        </Typography>
                        <Button variant="outlined" onClick={handleCloseModal} size="small" sx={{ minWidth: 'auto', p: 1 }}>
                            <Close />
                        </Button>
                    </Box>
                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                        <List>
                            {searchResults.map((song) => (
                                <ListItem key={song.id} disablePadding>
                                    <ListItemButton onClick={() => handleSongSelect(song)}>
                                        <ListItemAvatar>
                                            <Avatar src={song.thumbnail}>
                                                <MusicNote color="primary" />
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
