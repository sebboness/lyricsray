import { Box, Typography } from '@mui/material';
import { AgeBadge } from '@/components/AgeBadge';
import { EyebrowLabel } from '@/components/EyebrowLabel';
import { VerdictCard } from '@/components/VerdictCard';
import { getAppropriatenessDisplay, getShortAgeDisplay } from '@/util/displayHelpers';
import type { VerdictKey } from '@/util/displayHelpers';
import { verdict } from '@/theme/theme';

interface AppropriatenessCardProps {
    appropriate: number;
    recommendedAge: number;
    summary?: string;
}

const severitySegments: { key: VerdictKey; color: string }[] = [
    { key: 'safe', color: verdict.safe.main },
    { key: 'caution', color: verdict.caution.main },
    { key: 'blocked', color: verdict.blocked.main },
];

/**
 * The big result card: age + verdict + summary, plus a small severity-scale
 * indicator (the segment matching this result's verdict is highlighted).
 */
export function AppropriatenessCard({ appropriate, recommendedAge, summary }: AppropriatenessCardProps) {
    const display = getAppropriatenessDisplay(appropriate);

    return (
        <VerdictCard verdictKey={display.verdictKey} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box>
                    <AgeBadge verdictKey={display.verdictKey} size="large">
                        {getShortAgeDisplay(recommendedAge)}
                    </AgeBadge>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, width: 96 }}>
                        {severitySegments.map((segment) => (
                            <Box
                                key={segment.key}
                                sx={{
                                    flex: 1,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: segment.color,
                                    opacity: segment.key === display.verdictKey ? 1 : 0.25,
                                }}
                            />
                        ))}
                    </Box>
                </Box>

                <Box sx={{ flex: 1, minWidth: 200 }}>
                    <EyebrowLabel sx={{ color: display.color }}>Verdict</EyebrowLabel>
                    <Typography variant="h6" fontWeight={700} sx={{ color: display.color, mb: 1 }}>
                        {display.label}
                    </Typography>
                    {summary && (
                        <Typography variant="body2" color="text.secondary">
                            {summary}
                        </Typography>
                    )}
                </Box>
            </Box>
        </VerdictCard>
    );
}
