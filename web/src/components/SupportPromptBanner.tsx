import { Box, Button, Collapse, IconButton, Paper, Typography } from '@mui/material';
import Close from '@mui/icons-material/Close';
import { KO_FI_LINK } from '@/util/supportDev';
import { trackEvent } from '@/util/trackEvent';

interface SupportPromptBannerProps {
    onDismiss: () => void;
    showCount: number;
    analysisCount: number;
}

interface BannerCopy {
    heading: string;
    body: string;
}

function getBannerCopy(showCount: number, analysisCount: number): BannerCopy {
    if (showCount <= 1) {
        return {
            heading: 'You just saved yourself from a bad song choice.',
            body: 'LyricsRay is free, and a coffee keeps it that way for other parents.',
        };
    }
    if (showCount === 2) {
        return {
            heading: `You've checked ${analysisCount} songs with LyricsRay.`,
            body: 'If it\'s been useful, a coffee goes a long way. ☕',
        };
    }
    return {
        heading: 'You\'re a LyricsRay regular now.',
        body: 'If it\'s saving you from awkward car-ride moments, a coffee helps keep it free for everyone. ☕',
    };
}

export function SupportPromptBanner({ onDismiss, showCount, analysisCount }: SupportPromptBannerProps) {
    const { heading, body } = getBannerCopy(showCount, analysisCount);

    return (
        <Collapse in timeout={500}>
            <Paper
                variant="outlined"
                sx={{
                    position: 'relative',
                    p: 3,
                    pr: 6,
                    mb: 4,
                    borderRadius: 3,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    gap: 2,
                }}
            >
                <IconButton
                    onClick={() => { trackEvent('cta', { ctaAction: 'dismissed', ctaType: 'kofi' }); onDismiss(); }}
                    aria-label="Dismiss"
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                    <Close fontSize="small" />
                </IconButton>

                <Box flex={1}>
                    <Typography variant="body1" fontWeight="600" mb={0.5}>
                        {heading}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {body}
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    onClick={() => {
                        trackEvent('cta', { ctaAction: 'clicked', ctaType: 'kofi' });
                        window.open(KO_FI_LINK, '_blank', 'noopener,noreferrer');
                    }}
                >
                    ☕ Support on Ko-fi
                </Button>
            </Paper>
        </Collapse>
    );
}
