'use client';

import { ArrowDownward, InfoOutlined } from '@mui/icons-material';
import { Box, Button, Container, Link, Typography } from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface ContainerWithBackgroundProps {
    children: React.ReactNode;
}

export function ContainerWithBackground({ children }: ContainerWithBackgroundProps) {

    const { theme: currentTheme, systemTheme } = useNextTheme();

    // Determine the effective theme (accounting for system preference)
    const effectiveTheme = currentTheme === 'system' ? systemTheme : currentTheme;
    const isDarkMode = effectiveTheme === 'dark';

    const [mounted, setMounted] = useState(false);
    const [isHeaderLogoVisible, setIsHeaderLogoVisible] = useState(true);
    
    // Set initial window width after mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Observe header logo visibility
    useEffect(() => {
        const headerLogo = document.getElementById('header-logo');
        
        if (!headerLogo) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsHeaderLogoVisible(entry.isIntersecting);
            },
            {
                threshold: 0.1, // Trigger when 10% of logo is visible
                rootMargin: '-80px 0px 0px 0px', // Account for navbar height
            }
        );

        observer.observe(headerLogo);

        return () => observer.disconnect();
    }, []);

    // Emit visibility state to parent (for navbar)
    useEffect(() => {
        // Dispatch custom event that navbar can listen to
        window.dispatchEvent(
            new CustomEvent('headerLogoVisibility', { 
                detail: { visible: isHeaderLogoVisible } 
            })
        );
    }, [isHeaderLogoVisible]);

    // Handle scroll to main content
    const handleScrollToContent = () => {
        const element = document.getElementById('top-analyze-song-button');
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
                    <Box id="header-logo">
                        <Box
                            component="img"
                            src="/images/logo-textonly-768.png"
                            alt="LyricsRay"
                            sx={{
                                width: '100%',
                                maxWidth: '768px',
                                height: 'auto',
                                display: 'block',
                                filter: !mounted || isDarkMode 
                                    ? 'drop-shadow(0 4px 20px rgba(255, 0, 255, 0.6))' 
                                    : 'drop-shadow(0 4px 20px rgba(139, 0, 255, 0.4))',
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
                            id="top-analyze-song-button"
                            variant="contained"
                            size="large"
                            onClick={handleScrollToContent}
                            endIcon={<ArrowDownward />}
                            sx={{
                                px: 4,
                                py: 1.5,
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                boxShadow: !mounted || isDarkMode
                                    ? '0 2px 10px rgba(255, 0, 255, 0.5)'
                                    : '0 2px 10px rgba(139, 0, 255, 0.4)',
                                '&:hover': {
                                    transform: 'translateY(-3px)',
                                    boxShadow: !mounted || isDarkMode
                                        ? '0 2px 15px rgba(255, 0, 255, 0.6)'
                                        : '0 2px 15px rgba(139, 0, 255, 0.5)',
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
                                boxShadow: !mounted || isDarkMode
                                    ? '0 2px 10px rgba(255, 0, 255, 0.5)'
                                    : '0 2px 10px rgba(139, 0, 255, 0.4)',
                                '&:hover': {
                                    transform: 'translateY(-3px)',
                                    boxShadow: !mounted || isDarkMode
                                        ? '0 2px 15px rgba(255, 0, 255, 0.6)'
                                        : '0 2px 15px rgba(139, 0, 255, 0.5)',
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
                        src={`/images/logo-transparent-no-text${!mounted || isDarkMode ? "" : "-light"}.png`}
                        alt="LyricsRay Logo"
                        sx={{
                            width: '100%',
                            maxWidth: '768px',
                            height: 'auto',
                            display: 'block',
                            filter: isDarkMode 
                                ? 'drop-shadow(0 2px 10px rgba(255, 0, 255, 0.5))' 
                                : 'drop-shadow(0 2px 10px rgba(139, 0, 255, 0.3))',
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