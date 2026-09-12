'use client';

import { useMemo } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { keyframes, useTheme } from '@mui/material/styles';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { EyebrowLabel } from '@/components/EyebrowLabel';
import { verdict } from '@/theme/theme';

export type AnalyzeStepId = 'searching-song' | 'lyrics-found' | 'checking-themes' | 'setting-age';
export type AnalyzeStepStatus = 'pending' | 'active' | 'done';

export interface AnalyzeStep {
    id: AnalyzeStepId;
    label: string;
    status: AnalyzeStepStatus;
}

interface AnalyzingPanelProps {
    songName: string;
    artistName?: string;
    steps: AnalyzeStep[];
    onCancel: () => void;
}

const WAVEFORM_BAR_COUNT = 40;
const WAVEFORM_MIN_HEIGHT_PCT = 25;
const WAVEFORM_MAX_HEIGHT_PCT = 100;

const barPulse = keyframes`
    0%, 100% { transform: scaleY(0.35); opacity: 0.6; }
    50% { transform: scaleY(1); opacity: 1; }
`;

const dotPulse = keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
`;

const hexToRgb = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    const value = parseInt(clean, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

/** Mixes two hex colors, `t` in [0, 1] — used to make taller bars read brighter/turquoise. */
const mixColors = (fromHex: string, toHex: string, t: number): string => {
    const [r1, g1, b1] = hexToRgb(fromHex);
    const [r2, g2, b2] = hexToRgb(toHex);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Deterministic per-bar heights/timings so the waveform doesn't re-randomize
 * on every render. Color ramps from `baseColor` (short bars) to `peakColor`
 * (tall bars) so taller bars read brighter/more turquoise.
 */
function useWaveformBars(count: number, baseColor: string, peakColor: string) {
    return useMemo(
        () =>
            Array.from({ length: count }, () => {
                const height = WAVEFORM_MIN_HEIGHT_PCT + Math.round(Math.random() * (WAVEFORM_MAX_HEIGHT_PCT - WAVEFORM_MIN_HEIGHT_PCT));
                const t = (height - WAVEFORM_MIN_HEIGHT_PCT) / (WAVEFORM_MAX_HEIGHT_PCT - WAVEFORM_MIN_HEIGHT_PCT);
                return {
                    height,
                    color: mixColors(baseColor, peakColor, t),
                    duration: (0.7 + Math.random() * 0.7).toFixed(2),
                    delay: (Math.random() * 0.8).toFixed(2),
                };
            }),
        [count, baseColor, peakColor],
    );
}

/**
 * Inline "analyzing" state shown in place of the form while a song search or
 * lyrics analysis is in flight. Step statuses are driven by the caller
 * (LyricsAnalysisForm) — some steps resolve on real API responses, others are
 * timed placeholders, per the design's "fake but time-controlled" steps.
 */
export function AnalyzingPanel({ songName, artistName, steps, onCancel }: AnalyzingPanelProps) {
    const theme = useTheme();
    const bars = useWaveformBars(WAVEFORM_BAR_COUNT, theme.palette.primary.main, verdict.safe.main);

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: 96,
                    px: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    mb: 3,
                }}
            >
                {bars.map((bar, i) => (
                    <Box
                        key={i}
                        sx={{
                            width: 3,
                            height: `${bar.height}%`,
                            borderRadius: 3,
                            backgroundColor: bar.color,
                            transformOrigin: 'center',
                            animation: `${barPulse} ${bar.duration}s ease-in-out ${bar.delay}s infinite`,
                        }}
                    />
                ))}
            </Box>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <EyebrowLabel sx={{ color: 'primary.main' }}>Reading the lyrics</EyebrowLabel>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                    {songName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {artistName ? `${artistName} · ` : ''}usually about 8 seconds
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
                {steps.map((step) => (
                    <Box key={step.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                flexShrink: 0,
                                backgroundColor: step.status === 'pending' ? 'transparent' : 'primary.main',
                                border: step.status === 'pending' ? '1px solid' : 'none',
                                borderColor: 'divider',
                                animation: step.status === 'active' ? `${dotPulse} 1.2s ease-in-out infinite` : 'none',
                            }}
                        />
                        <Typography
                            sx={{
                                flex: 1,
                                fontWeight: step.status === 'active' ? 600 : 400,
                                color: step.status === 'pending' ? 'text.secondary' : 'text.primary',
                            }}
                        >
                            {step.label}
                        </Typography>
                        {step.status === 'done' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                                <CheckCircle sx={{ fontSize: 16 }} />
                                <Typography variant="caption" sx={{ color: 'inherit' }}>OK</Typography>
                            </Box>
                        )}
                    </Box>
                ))}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
                We never store your child&apos;s name or listening history.
            </Typography>

            <Button variant="outlined" fullWidth onClick={onCancel}>
                Cancel
            </Button>
        </Box>
    );
}
