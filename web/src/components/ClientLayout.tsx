'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    AppBar,
    Toolbar,
    Link,
    Switch,
    FormControlLabel,
    Typography,
    useMediaQuery,
} from '@mui/material';
import {
    DarkMode,
    LightMode
} from '@mui/icons-material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme } from '@/theme/theme';

interface ClientLayoutProps {
    children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
    const [darkMode, setDarkMode] = useState(true);
    const [mounted, setMounted] = useState(false);
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    
    useEffect(() => {
        setMounted(true);
        setDarkMode(prefersDarkMode);
    }, [prefersDarkMode]);

    const theme = getTheme(darkMode);

    if (!mounted) {
        return null; // Prevent hydration mismatch
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ 
                minHeight: '100vh',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Animated background elements */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `radial-gradient(circle at 20% 20%, rgba(255, 0, 255, 0.1) 0%, transparent 50%),
                                   radial-gradient(circle at 80% 80%, rgba(0, 204, 255, 0.1) 0%, transparent 50%),
                                   radial-gradient(circle at 40% 60%, rgba(153, 51, 255, 0.05) 0%, transparent 50%)`,
                        animation: 'pulse 4s ease-in-out infinite',
                        '@keyframes pulse': {
                            '0%, 100%': { opacity: 0.7 },
                            '50%': { opacity: 1 },
                        },
                    }}
                />

                {/* Floating Navigation Bar */}
                <AppBar 
                    position="fixed" 
                    sx={{ 
                        background: theme.palette.background.paper,
                        backdropFilter: 'blur(15px)',
                        borderBottom: '1px solid rgba(255, 0, 255, 0.2)',
                        boxShadow: '0 4px 20px rgba(255, 0, 255, 0.15)',
                        zIndex: 1000,
                        top: 0,
                    }}
                >
                    <Container maxWidth="md">
                        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 0, sm: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Link 
                                    href="/" 
                                    sx={{ 
                                        color: theme.palette.text.primary,
                                        textDecoration: 'none',
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        transition: 'color 0.3s ease',
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src="/images/logo-textonly-64.png"
                                        alt="LyricsRay"
                                        sx={{
                                            width: '100%',
                                            maxHeight: '32px',
                                            height: 'auto',
                                            display: 'block',
                                            margin: '0 auto',
                                            transition: 'all 0.3s ease-in-out',
                                            '&:hover': {
                                                filter: darkMode 
                                                    ? 'drop-shadow(0 0 8px rgba(255, 0, 255, 0.5))' 
                                                    : 'brightness(1.2) contrast(1.2) drop-shadow(0 3px 10px rgba(139, 0, 255, 0.3))',
                                            },
                                        }}
                                    />
                                </Link>

                                <Link 
                                    href="/about" 
                                    sx={{ 
                                        color: theme.palette.text.primary,
                                        textDecoration: 'none',
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        transition: 'color 0.3s ease',
                                        '&:hover': {
                                            color: theme.palette.primary.main,
                                        }
                                    }}
                                >
                                    About
                                </Link>
                            </Box>

                            <FormControlLabel
                                title={`Turn on ${darkMode ? 'Light' : 'Dark'} mode`}
                                control={
                                    <Switch
                                        checked={darkMode}
                                        onChange={(e) => setDarkMode(e.target.checked)}
                                        sx={{
                                            '& .MuiSwitch-thumb': {
                                                backgroundColor: darkMode ? '#8b00ff' : '#ff00ff',
                                            },
                                            '& .MuiSwitch-track': {
                                                backgroundColor: darkMode ? 'rgba(139, 0, 255, 0.3)' : 'rgba(255, 0, 255, 0.3)',
                                            },
                                        }}
                                    />
                                }
                                label={
                                    <Box sx={{
                                            color: theme.palette.text.primary,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1 
                                        }}>
                                        {darkMode ? <DarkMode /> : <LightMode sx={{ color: '#ffd440' }} />}
                                        {darkMode ? 'Dark' : 'Light'}
                                    </Box>
                                }
                            />
                        </Toolbar>
                    </Container>
                </AppBar>

                {/* Main Content with padding to account for fixed navbar */}
                <Box sx={{ flex: 1, pt: 0, my: 4 }}>
                    {children}
                </Box>

                {/* Footer */}
                <Box 
                    component="footer"
                    sx={{ 
                        mt: 'auto',
                        background: 'rgba(26, 26, 46, 0.9)',
                        backdropFilter: 'blur(10px)',
                        borderTop: '1px solid rgba(255, 0, 255, 0.2)',
                        py: 3,
                        position: 'relative',
                        zIndex: 20
                    }}
                >
                    <Container maxWidth="md">
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            gap: 4,
                            flexWrap: 'wrap'
                        }}>
                            <Link 
                                href="/about"
                                sx={{ 
                                    color: theme.palette.text.secondary,
                                    textDecoration: 'none',
                                    fontSize: '0.9rem',
                                    transition: 'color 0.3s ease',
                                    '&:hover': {
                                        color: theme.palette.primary.main,
                                    }
                                }}
                            >
                                About
                            </Link>
                            <Typography variant="body2" color="text.secondary">•</Typography>
                            <Link 
                                href="https://hexonite.net"
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ 
                                    color: theme.palette.text.secondary,
                                    textDecoration: 'none',
                                    fontSize: '0.9rem',
                                    transition: 'color 0.3s ease',
                                    '&:hover': {
                                        color: theme.palette.secondary.main,
                                    }
                                }}
                            >
                                Created by Hexonite
                            </Link>
                        </Box>
                        <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ 
                                display: 'block',
                                textAlign: 'center',
                                mt: 2,
                                opacity: 0.7
                            }}
                        >
                            © 2025 LyricsRay. AI-powered lyric analysis for child safety.
                        </Typography>
                    </Container>
                </Box>
            </Box>
        </ThemeProvider>
    );
}
