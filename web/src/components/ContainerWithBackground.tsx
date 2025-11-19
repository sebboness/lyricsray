'use client';

import { Box, Container } from '@mui/material';
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

    const [scrollY, setScrollY] = useState(0);
    const [windowW, setWindowW] = useState(1024);
    const [mounted, setMounted] = useState(false);
    
    // Set initial window width after mount
    useEffect(() => {
        setMounted(true);
        setWindowW(window.innerWidth);
    }, []);
    
    // Handle scroll events
    useEffect(() => {
        if (!mounted) return;

        const handleScroll = () => setScrollY(window.scrollY);
        const handleWidth = () => setWindowW(window.innerWidth);

        window.addEventListener('resize', handleWidth);
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('resize', handleWidth);
            window.removeEventListener('scroll', handleScroll)
        };
    }, []);

    // Calculate dynamic values based on scroll position
    const logoWidth = Math.min(1024, windowW);
    const logoRatio = logoWidth / 1024;
    const logoHeight = logoRatio * 880;
    const maxScroll = logoHeight * 0.8; // Start fading when 80% of logo would be scrolled past
    const scrollProgress = Math.min(scrollY / maxScroll, 1);
    const logoOpacity = Math.max(1 - scrollProgress, 0);

    return (
        <>
            {mounted && (<Box
                sx={{
                    position: 'fixed',
                    top: 48,
                    left: 0,
                    right: 0,
                    height: `${logoHeight}px`,
                    backgroundImage: `url(/images/logo-transparent-no-text${isDarkMode ? "" : "-light"}.png)`,
                    backgroundPosition: 'top center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain',
                    opacity: logoOpacity,
                    zIndex: 1,
                    pointerEvents: 'none',
                    transition: 'opacity 0.1s ease-out',
                }}
            />)}

            <Container 
                maxWidth="md" 
                sx={{ 
                    position: 'relative', 
                    zIndex: 10,
                    pt: `${logoHeight + 48}px`,
                    pb: 4,
                    transition: 'padding-top 0.1s ease-out',
                }}
            >
                {children}
            </Container>
        </>
    );
}