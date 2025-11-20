'use client';

import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, useTheme as useNextTheme } from 'next-themes';
import { getTheme } from '@/theme/theme';
import { useEffect, useState } from 'react';

interface ThemeRegistryProps {
    children: React.ReactNode;
}

function MuiThemeWrapper({ children }: ThemeRegistryProps) {
    const { resolvedTheme } = useNextTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Use dark theme as default during SSR to match initial render
    const isDark = mounted ? resolvedTheme === 'dark' : true;
    const theme = getTheme(isDark);

    // Prevent flash by not rendering until mounted
    if (!mounted) {
        return (
            <MuiThemeProvider theme={getTheme(true)}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        );
    }

    return (
        <MuiThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </MuiThemeProvider>
    );
}

export function ThemeRegistry({ children }: ThemeRegistryProps) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={true}
            storageKey="lyricsray-theme"
        >
            <MuiThemeWrapper>
                {children}
            </MuiThemeWrapper>
        </ThemeProvider>
    );
}