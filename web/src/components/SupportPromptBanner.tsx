import { useEffect, useState } from 'react';
import { Box, Button, Collapse, IconButton, Paper, Typography } from '@mui/material';
import Close from '@mui/icons-material/Close';
import { KO_FI_LINK } from '@/util/supportDev';

interface SupportPromptBannerProps {
    onDismiss: () => void;
}

const APPEARANCE_DELAY_MS = 3000;

export function SupportPromptBanner({ onDismiss }: SupportPromptBannerProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), APPEARANCE_DELAY_MS);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Collapse in={visible} timeout={500}>
            <Paper
                variant="outlined"
                sx={{
                    position: 'relative',
                    p: 3,
                    pr: 6,
                    mb: 4,
                    borderRadius: 3,
                    borderColor: 'rgba(255, 0, 255, 0.3)',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'stretch', sm: 'center' },
                    gap: 2,
                }}
            >
                <IconButton
                    onClick={onDismiss}
                    aria-label="Dismiss"
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                    <Close fontSize="small" />
                </IconButton>

                <Box flex={1}>
                    <Typography variant="body1" fontWeight="600" mb={0.5}>
                        We hope this helped
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        We hope this analysis helped you make a great choice for your child. LyricsRay stays
                        free thanks to people who chip in a little to help cover the hosting costs.
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    href={KO_FI_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ☕ Support on Ko-fi
                </Button>
            </Paper>
        </Collapse>
    );
}
