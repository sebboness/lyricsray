'use client';

import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { getTheme } from '@/theme/theme';

interface ThemeRegistryProps {
    children: React.ReactNode;
}

const theme = getTheme();

export function ThemeRegistry({ children }: ThemeRegistryProps) {
    return (
        <AppRouterCacheProvider options={{ key: 'mui' }}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </AppRouterCacheProvider>
    );
}
