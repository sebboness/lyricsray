'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import WarningRounded from '@mui/icons-material/WarningRounded';
import { hasExplicitConsent, setExplicitConsent } from '@/util/explicitConsentClient';

interface ExplicitContentGateProps {
    children: () => React.ReactNode;
}

// Stand-in text shown (blurred) in place of the real content until consent is
// given, so the page still looks populated without the real content ever
// being present in the DOM for devtools to reveal.
const FAKE_CONTENT_PLACEHOLDER = `Lorem ipsum dolor sit amet
consectetur adipiscing elit
Sed do eiusmod tempor incididunt ut
labore et dolore magna aliqua

Ut enim ad minim veniam, quis
nostrud exercitation ullamco laboris
Duis aute irure dolor in reprehenderit
in voluptate velit esse cillum

Excepteur sint occaecat cupidatat non proident,
sunt in culpa qui Officia deserunt mollit
anim id est laborum, perspiciatis unde omnis
Iste natus error sit voluptatem accusantium

doloremque laudantium Totam rem aperiam, eaque
ipsa quae ab illo inventore veritatis`;

/**
 * Wraps mature-rated content (e.g. lyrics) with a blurred overlay and an age
 * confirmation prompt until the user has previously confirmed, or confirms
 * now, that they are old enough to view it.
 */
export function ExplicitContentGate({ children }: ExplicitContentGateProps) {
    const [consented, setConsented] = useState(false);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        setConsented(hasExplicitConsent());
        setChecked(true);
    }, []);

    const handleConsent = () => {
        setExplicitConsent();
        setConsented(true);
    };

    if (checked && consented) {
        return <>{children()}</>;
    }

    return (
        <Box sx={{ position: 'relative' }}>
            <Paper
                aria-hidden
                sx={{
                    p: 3,
                    maxHeight: 400,
                    overflow: 'hidden',
                    bgcolor: 'rgba(0, 0, 0, 0.02)',
                    filter: 'blur(8px)',
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}
            >
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}
                >
                    {FAKE_CONTENT_PLACEHOLDER}
                </Typography>
            </Paper>

            {checked && (
                <Box
                    role="alertdialog"
                    aria-label="Mature content warning"
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: 2,
                        p: { xs: 2, sm: 4 },
                        bgcolor: 'rgba(0, 0, 0, 0.55)',
                        borderRadius: 1,
                        zIndex: 2,
                    }}
                >
                    <WarningRounded sx={{ fontSize: 40, color: '#fff' }} />
                    <Typography variant="h6" fontWeight={600} color="#fff">
                        This song contains mature content
                    </Typography>
                    <Typography variant="body2" color="#fff" sx={{ maxWidth: 420 }}>
                        The lyrics below may include explicit language or mature themes.
                        Please confirm your age to view them.
                    </Typography>
                    <Button variant="contained" size="large" onClick={handleConsent}>
                        I am at least 18 years old
                    </Button>
                </Box>
            )}
        </Box>
    );
}
