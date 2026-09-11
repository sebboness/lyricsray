'use client';

import ArrowDownward from '@mui/icons-material/ArrowDownward';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { Box, Button, Container, Link, Typography } from '@mui/material';

interface ContainerWithBackgroundProps {
    children: React.ReactNode;
}

export function ContainerWithBackground({ children }: ContainerWithBackgroundProps) {

    // Handle scroll to main content
    const handleScrollToContent = () => {
        const element = document.getElementById('analyze-form-wrapper');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <Container 
            maxWidth="md" 
            sx={{ 
                position: 'relative', 
                zIndex: 10,
                pt: 8,
                pb: 4,
            }}
        >
            {/* Header Section: Logo/Text (Left) + Giant Image (Right) */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 4,
                    mb: 6,
                    alignItems: 'center',
                }}
            >
                {/* Left Side: Logo + Text + Button (50% width) */}
                <Box
                    sx={{
                        width: { xs: '100%', md: '50%' },
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                    }}
                >
                    {/* LyricsRay Logo */}
                    <Box>
                        <Box
                            component="img"
                            src="/images/logo-textonly-768.png"
                            alt="LyricsRay"
                            sx={{
                                width: '100%',
                                maxWidth: '768px',
                                height: 'auto',
                                display: 'block',
                            }}
                        />
                    </Box>

                    {/* Intro Text */}
                    <Typography 
                        variant="body1" 
                        color="text.secondary"
                        sx={{
                            fontSize: { xs: '1rem', sm: '1.1rem' },
                            lineHeight: 1.7,
                        }}
                    >
                        LyricsRay helps you determine whether a song is appropriate for your child 
                        based on its lyrics content. Using advanced AI analysis, we evaluate songs 
                        for explicit language, mature themes, and age-appropriate content.
                    </Typography>

                    {/* Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleScrollToContent}
                            endIcon={<ArrowDownward />}
                            sx={{
                                px: 4,
                                py: 1.5,
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                boxShadow: '0 2px 10px rgba(255, 0, 255, 0.5)',
                                '&:hover': {
                                    transform: 'translateY(-3px)',
                                    boxShadow: '0 2px 15px rgba(255, 0, 255, 0.6)',
                                },
                            }}
                        >
                            Analyze a Song
                        </Button>
                        <Button
                            component={Link}
                            href="/about"
                            variant="contained"
                            size="large"
                            endIcon={<InfoOutlined />}
                            sx={{
                                px: 4,
                                py: 1.5,
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                boxShadow: '0 2px 10px rgba(255, 0, 255, 0.5)',
                                '&:hover': {
                                    transform: 'translateY(-3px)',
                                    boxShadow: '0 2px 15px rgba(255, 0, 255, 0.6)',
                                },
                            }}
                        >
                            About
                        </Button>
                    </Box>
                </Box>

                {/* Right Side: Giant Logo Image (50% width) */}
                <Box
                    sx={{
                        width: { xs: '0%', md: '50%' },
                        display: { xs: 'none', md: 'flex' },
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Box
                        component="img"
                        src="/images/logo-transparent-no-text-512.png"
                        alt="LyricsRay Logo"
                        sx={{
                            width: '100%',
                            maxWidth: '512px',
                            height: 'auto',
                            display: 'block',
                        }}
                    />
                </Box>
            </Box>

            {/* Main Content (from children) */}
            <Box id="main-content">
                {children}
            </Box>
        </Container>
    );
}