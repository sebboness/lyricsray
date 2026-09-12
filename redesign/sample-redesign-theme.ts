import { createTheme } from "@mui/material/styles";

/**
 * Verdict colors. These are semantic, not decorative: teal/amber/red mean
 * safe / listen first / not for kids and are never used for branding.
 * Violet is the app's own voice and never carries a verdict.
 */
export const verdict = {
    safe: { dark: '#46d6c4', light: '#0f8478', border: '#1f4a45', surface: '#101d1c' },
    caution: { dark: '#f2b74a', light: '#a06a10', border: '#4a3c1c', surface: '#1a1710' },
    blocked: { dark: '#ff5c47', light: '#c2301c', border: '#4a2420', surface: '#1a1011' },
} as const;

/** Fixed-width family used for labels, ages and metadata. */
export const monoFamily = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

/** Reusable style for the small mono eyebrow labels ("WHAT'S IN IT", "VERDICT"). */
export const labelSx = {
    fontFamily: monoFamily,
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
};

/**
 * Gets the theme of the app.
 * @param darkMode Whether dark mode is enabled or not
 * @returns The theme
 */
export const getTheme = (darkMode: boolean) => createTheme({
    palette: {
        mode: darkMode ? 'dark' : 'light',
        primary: {
            main: darkMode ? '#9d90ff' : '#5b4bd6',
            light: darkMode ? '#c3baff' : '#8477ec',
            dark: darkMode ? '#7c6bff' : '#3f31a8',
            contrastText: darkMode ? '#0a0a10' : '#ffffff',
        },
        secondary: {
            main: darkMode ? '#46d6c4' : '#0f8478',
            light: darkMode ? '#7ce7da' : '#33a598',
            dark: darkMode ? '#27a898' : '#0a6057',
            contrastText: darkMode ? '#0a0a10' : '#ffffff',
        },
        background: {
            default: darkMode ? '#0a0a10' : '#f7f7fb',
            paper: darkMode ? '#14151d' : '#ffffff',
        },
        text: {
            primary: darkMode ? '#eef1f4' : '#16171f',
            secondary: darkMode ? '#8a939e' : '#5c6270',
            disabled: darkMode ? '#5b636d' : '#9ba1ad',
        },
        divider: darkMode ? '#23242f' : '#e3e4ec',
        info: { main: darkMode ? '#9d90ff' : '#5b4bd6' },
        success: { main: verdict.safe[darkMode ? 'dark' : 'light'] },
        warning: { main: verdict.caution[darkMode ? 'dark' : 'light'] },
        error: { main: verdict.blocked[darkMode ? 'dark' : 'light'] },
        action: {
            hover: darkMode ? 'rgba(157, 144, 255, 0.08)' : 'rgba(91, 75, 214, 0.06)',
            selected: darkMode ? 'rgba(157, 144, 255, 0.14)' : 'rgba(91, 75, 214, 0.10)',
        },
    },
    shape: { borderRadius: 11 },
    spacing: 8,
    typography: {
        fontFamily: '"Space Grotesk", system-ui, -apple-system, sans-serif',
        // No gradient text, no glow. Weight and scale carry the hierarchy.
        h1: { fontWeight: 500, fontSize: '2.75rem', lineHeight: 1.08, letterSpacing: '-0.03em' },
        h2: { fontWeight: 500, fontSize: '2.125rem', lineHeight: 1.1, letterSpacing: '-0.025em' },
        h3: { fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.15, letterSpacing: '-0.02em' },
        h4: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.2, letterSpacing: '-0.015em' },
        h5: { fontWeight: 500, fontSize: '1.25rem', lineHeight: 1.25 },
        h6: { fontWeight: 500, fontSize: '1.0625rem', lineHeight: 1.3 },
        body1: { fontSize: '0.9375rem', lineHeight: 1.5 },
        body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
        subtitle2: { fontSize: '0.78125rem', lineHeight: 1.4, fontWeight: 400 },
        button: { fontWeight: 700, fontSize: '0.9375rem', textTransform: 'none' },
        overline: { ...labelSx, fontWeight: 400, lineHeight: 1.4 },
        caption: { fontFamily: monoFamily, fontSize: '0.6875rem', letterSpacing: '0.04em' },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: { textWrap: 'pretty' },
                'a': {
                    color: darkMode ? '#9d90ff' : '#5b4bd6',
                    textDecoration: 'none',
                },
                'a:hover': { color: darkMode ? '#c3baff' : '#3f31a8' },
            },
        },
        MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: `1px solid ${darkMode ? '#23242f' : '#e3e4ec'}`,
                },
                outlined: { borderColor: darkMode ? '#23242f' : '#e3e4ec' },
            },
        },
        MuiAppBar: {
            defaultProps: { elevation: 0, color: 'transparent' },
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: darkMode ? '#0a0a10' : '#ffffff',
                    borderBottom: `1px solid ${darkMode ? '#1c1d26' : '#e3e4ec'}`,
                },
            },
        },
        MuiToolbar: { styleOverrides: { root: { minHeight: 60, '@media (min-width:600px)': { minHeight: 60 } } } },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { borderRadius: 11, paddingInline: 18, minHeight: 44 },
                containedPrimary: {
                    backgroundColor: darkMode ? '#7c6bff' : '#5b4bd6',
                    color: darkMode ? '#f4f2ff' : '#ffffff',
                    '&:hover': { backgroundColor: darkMode ? '#9d90ff' : '#4a3bc0' },
                },
                outlined: {
                    borderColor: darkMode ? '#23242f' : '#d8dae4',
                    color: darkMode ? '#eef1f4' : '#16171f',
                    fontWeight: 500,
                    '&:hover': {
                        borderColor: darkMode ? '#3b3480' : '#b9bccb',
                        backgroundColor: darkMode ? 'rgba(157,144,255,0.06)' : 'rgba(91,75,214,0.04)',
                    },
                },
                text: { fontWeight: 500 },
            },
        },
        MuiTextField: { defaultProps: { variant: 'outlined', size: 'medium' } },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: darkMode ? '#14151d' : '#ffffff',
                    borderRadius: 11,
                    '& fieldset': { borderColor: darkMode ? '#23242f' : '#dcdee8' },
                    '&:hover fieldset': { borderColor: darkMode ? '#2c2760' : '#c2c5d4' },
                    '&.Mui-focused fieldset': {
                        borderWidth: 1,
                        borderColor: darkMode ? '#9d90ff' : '#5b4bd6',
                    },
                },
                input: { fontSize: '1rem' },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: { ...labelSx, color: darkMode ? '#6d757f' : '#6b7280', '&.Mui-focused': { color: darkMode ? '#9d90ff' : '#5b4bd6' } },
            },
        },
        MuiCard: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: {
                    borderRadius: 14,
                    backgroundImage: 'none',
                    transition: 'border-color 0.18s ease',
                    '&:hover': { borderColor: darkMode ? '#2c2760' : '#c9c7ee' },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { borderRadius: 999, fontSize: '0.78125rem', height: 28 },
                outlined: { borderColor: darkMode ? '#23242f' : '#dcdee8', color: darkMode ? '#8a939e' : '#5c6270' },
                filledPrimary: { backgroundColor: darkMode ? '#7c6bff' : '#5b4bd6', color: darkMode ? '#f4f2ff' : '#fff', fontWeight: 500 },
            },
        },
        MuiTabs: {
            styleOverrides: {
                root: { minHeight: 40 },
                indicator: { height: 2, backgroundColor: darkMode ? '#9d90ff' : '#5b4bd6' },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontSize: '0.84375rem',
                    minHeight: 40,
                    color: darkMode ? '#8a939e' : '#5c6270',
                    '&.Mui-selected': { color: darkMode ? '#eef1f4' : '#16171f', fontWeight: 500 },
                },
            },
        },
        MuiLinearProgress: {
            // Used for the severity bars on the result screen.
            styleOverrides: {
                root: { height: 6, borderRadius: 3, backgroundColor: darkMode ? '#1c1d26' : '#ebecf3' },
                bar: { borderRadius: 3 },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottomColor: darkMode ? '#14151d' : '#eceef4',
                    paddingBlock: 12,
                },
                head: { ...labelSx, color: darkMode ? '#6d757f' : '#6b7280', borderBottomColor: darkMode ? '#1c1d26' : '#e3e4ec' },
            },
        },
        MuiListItemButton: {
            styleOverrides: { root: { minHeight: 52, borderRadius: 0 } },
        },
        MuiDivider: { styleOverrides: { root: { borderColor: darkMode ? '#1c1d26' : '#e3e4ec' } } },
        MuiBottomNavigation: {
            styleOverrides: {
                root: {
                    height: 68,
                    backgroundColor: darkMode ? '#0a0a10' : '#ffffff',
                    borderTop: `1px solid ${darkMode ? '#1c1d26' : '#e3e4ec'}`,
                },
            },
        },
        MuiBottomNavigationAction: {
            styleOverrides: {
                root: { minWidth: 64, color: darkMode ? '#5b636d' : '#8b90a0' },
                label: { fontSize: 10, letterSpacing: '0.06em', '&.Mui-selected': { fontSize: 10 } },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: darkMode ? '#23242f' : '#16171f',
                    fontSize: '0.75rem',
                    borderRadius: 8,
                },
            },
        },
        MuiBackdrop: { styleOverrides: { root: { backgroundColor: 'rgba(10, 10, 16, 0.72)' } } },
        MuiDialog: {
            styleOverrides: { paper: { borderRadius: 16, border: `1px solid ${darkMode ? '#2c2d3a' : '#e3e4ec'}` } },
        },
    },
});
