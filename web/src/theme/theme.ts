import { createTheme } from "@mui/material/styles";

/**
 * Verdict colors. These are semantic, not decorative: teal/amber/red mean
 * safe / listen first / not for kids and are never used for branding.
 * Violet is the app's own voice and never carries a verdict.
 */
export const verdict = {
    safe: { main: '#46d6c4', border: '#1f4a45', surface: '#101d1c' },
    caution: { main: '#f2b74a', border: '#4a3c1c', surface: '#1a1710' },
    blocked: { main: '#ff5c47', border: '#4a2420', surface: '#1a1011' },
} as const;

/** Fixed-width family used for labels, ages and metadata. */
export const monoFamily = 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, monospace';

/** Reusable style for the small mono eyebrow labels ("WHAT'S IN IT", "VERDICT"). */
export const labelSx = {
    fontFamily: monoFamily,
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
};

/**
 * Gets the app's theme. Dark mode only — there is no light-mode variant.
 * @returns The theme
 */
export const getTheme = () => createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#9d90ff',
            light: '#c3baff',
            dark: '#7c6bff',
            contrastText: '#0a0a10',
        },
        secondary: {
            main: verdict.safe.main,
            light: '#7ce7da',
            dark: '#27a898',
            contrastText: '#0a0a10',
        },
        background: {
            default: '#0a0a10',
            paper: '#14151d',
        },
        text: {
            primary: '#eef1f4',
            secondary: '#8a939e',
            disabled: '#5b636d',
        },
        divider: '#23242f',
        info: { main: '#9d90ff' },
        success: { main: verdict.safe.main },
        warning: { main: verdict.caution.main },
        error: { main: verdict.blocked.main },
        action: {
            hover: 'rgba(157, 144, 255, 0.08)',
            selected: 'rgba(157, 144, 255, 0.14)',
        },
    },
    shape: { borderRadius: 11 },
    spacing: 8,
    typography: {
        fontFamily: 'var(--font-space-grotesk), system-ui, -apple-system, sans-serif',
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
                    color: '#9d90ff',
                    textDecoration: 'none',
                },
                'a:hover': { color: '#c3baff' },
            },
        },
        MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: '1px solid #23242f',
                },
                outlined: { borderColor: '#23242f' },
            },
        },
        MuiAppBar: {
            defaultProps: { elevation: 0, color: 'transparent' },
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: '#0a0a10',
                    borderBottom: '1px solid #1c1d26',
                },
            },
        },
        MuiToolbar: { styleOverrides: { root: { minHeight: 60, '@media (min-width:600px)': { minHeight: 60 } } } },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { borderRadius: 11, paddingInline: 18, minHeight: 44 },
                containedPrimary: {
                    backgroundColor: '#7c6bff',
                    color: '#f4f2ff',
                    '&:hover': { backgroundColor: '#9d90ff' },
                },
                outlined: {
                    borderColor: '#23242f',
                    color: '#eef1f4',
                    fontWeight: 500,
                    '&:hover': {
                        borderColor: '#3b3480',
                        backgroundColor: 'rgba(157,144,255,0.06)',
                    },
                },
                text: { fontWeight: 500 },
            },
        },
        MuiTextField: { defaultProps: { variant: 'outlined', size: 'medium' } },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: '#14151d',
                    borderRadius: 11,
                    '& fieldset': { borderColor: '#23242f' },
                    '&:hover fieldset': { borderColor: '#2c2760' },
                    '&.Mui-focused fieldset': {
                        borderWidth: 1,
                        borderColor: '#9d90ff',
                    },
                },
                input: { fontSize: '1rem' },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: { ...labelSx, color: '#6d757f', '&.Mui-focused': { color: '#9d90ff' } },
            },
        },
        MuiCard: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: {
                    borderRadius: 14,
                    backgroundImage: 'none',
                    transition: 'border-color 0.18s ease',
                    '&:hover': { borderColor: '#2c2760' },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { borderRadius: 999, fontSize: '0.78125rem', height: 28 },
                outlined: { borderColor: '#23242f', color: '#8a939e' },
                filledPrimary: { backgroundColor: '#7c6bff', color: '#f4f2ff', fontWeight: 500 },
            },
        },
        MuiTabs: {
            styleOverrides: {
                root: { minHeight: 40 },
                indicator: { height: 2, backgroundColor: '#9d90ff' },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontSize: '0.84375rem',
                    minHeight: 40,
                    color: '#8a939e',
                    '&.Mui-selected': { color: '#eef1f4', fontWeight: 500 },
                },
            },
        },
        MuiLinearProgress: {
            // Used for the severity bars on the result screen.
            styleOverrides: {
                root: { height: 6, borderRadius: 3, backgroundColor: '#1c1d26' },
                bar: { borderRadius: 3 },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottomColor: '#14151d',
                    paddingBlock: 12,
                },
                head: { ...labelSx, color: '#6d757f', borderBottomColor: '#1c1d26' },
            },
        },
        MuiListItemButton: {
            styleOverrides: { root: { minHeight: 52, borderRadius: 0 } },
        },
        MuiDivider: { styleOverrides: { root: { borderColor: '#1c1d26' } } },
        MuiBottomNavigation: {
            styleOverrides: {
                root: {
                    height: 68,
                    backgroundColor: '#0a0a10',
                    borderTop: '1px solid #1c1d26',
                },
            },
        },
        MuiBottomNavigationAction: {
            styleOverrides: {
                root: { minWidth: 64, color: '#5b636d' },
                label: { fontSize: 10, letterSpacing: '0.06em', '&.Mui-selected': { fontSize: 10 } },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: '#23242f',
                    fontSize: '0.75rem',
                    borderRadius: 8,
                },
            },
        },
        MuiBackdrop: { styleOverrides: { root: { backgroundColor: 'rgba(10, 10, 16, 0.72)' } } },
        MuiDialog: {
            styleOverrides: { paper: { borderRadius: 16, border: '1px solid #2c2d3a' } },
        },
    },
});
