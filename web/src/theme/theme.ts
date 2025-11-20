import { createTheme } from "@mui/material/styles";

/**
 * Gets the theme of the app.
 * @param darkMode Whether dark mode is enabled or not
 * @returns The theme
 */
export const getTheme = (darkMode: boolean) => createTheme({
    palette: {
        mode: darkMode ? 'dark' : 'light',
        primary: {
            main: darkMode ? '#ff00ff' : '#8b00ff', // Magenta/Purple from logo
            light: '#ff66ff',
            dark: '#cc00cc',
        },
        secondary: {
            main: darkMode ? '#00ccff' : '#0066cc', // Cyan blue from logo
            light: '#66d9ff',
            dark: '#0099cc',
        },
        background: {
            default: darkMode ? '#000015' : '#f8f9ff',
            paper: darkMode ? '#1a1a2e' : '#ffffff',
        },
        text: {
            primary: darkMode ? '#ffffff' : '#1a1a2e',
            secondary: darkMode ? '#ccccff' : '#666699',
        },
        info: {
            main: darkMode ? '#9933ff' : '#6600cc', // Purple accent from logo
        },
        success: {
            main: darkMode ? '#00ff88' : '#00cc66',
        },
        error: {
            main: darkMode ? '#ff3366' : '#cc0033',
        },
        warning: {
            main: darkMode ? '#ffaa00' : '#ff8800',
        },
    },
    typography: {
        fontFamily: '"Orbitron", "Roboto", "Arial", sans-serif',
        h1: {
            fontWeight: 700,
            fontSize: '3rem',
            background: darkMode 
                ? 'linear-gradient(45deg, #ff00ff 30%, #00ccff 90%)'
                : 'linear-gradient(45deg, #8b00ff 30%, #0066cc 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: darkMode ? '0 0 20px rgba(255, 0, 255, 0.5)' : 'none',
        },
        h2: {
            fontWeight: 600,
            color: darkMode ? '#ff00ff' : '#8b00ff',
        },
        h4: {
            fontWeight: 600,
            color: darkMode ? '#00ccff' : '#0066cc',
        },
        h5: {
            fontWeight: 600,
            color: darkMode ? '#ff00ff' : '#8b00ff',
        },
        h6: {
            fontWeight: 600,
        },
        body1: {
            lineHeight: 1.6,
        },
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: darkMode 
                        ? 'linear-gradient(135deg, rgba(255, 0, 255, 0.1) 0%, rgba(0, 204, 255, 0.1) 100%)'
                        : 'linear-gradient(135deg, rgba(139, 0, 255, 0.05) 0%, rgba(0, 102, 204, 0.05) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode 
                        ? '1px solid rgba(255, 0, 255, 0.2)'
                        : '1px solid rgba(139, 0, 255, 0.2)',
                    boxShadow: darkMode
                        ? '0 8px 32px rgba(255, 0, 255, 0.1)'
                        : '0 4px 16px rgba(0, 0, 0, 0.1)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    background: darkMode
                        ? 'linear-gradient(45deg, #ff00ff 30%, #00ccff 90%)'
                        : 'linear-gradient(45deg, #8b00ff 30%, #0066cc 90%)',
                    boxShadow: darkMode
                        ? '0 4px 20px rgba(255, 0, 255, 0.3)'
                        : '0 4px 15px rgba(139, 0, 255, 0.2)',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: darkMode
                            ? '0 6px 25px rgba(255, 0, 255, 0.4)'
                            : '0 6px 20px rgba(139, 0, 255, 0.3)',
                    },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                            borderColor: darkMode ? 'rgba(255, 0, 255, 0.3)' : 'rgba(139, 0, 255, 0.3)',
                        },
                        '&:hover fieldset': {
                            borderColor: darkMode ? '#ff00ff' : '#8b00ff',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: darkMode ? '#00ccff' : '#0066cc',
                            boxShadow: darkMode 
                                ? '0 0 10px rgba(0, 204, 255, 0.3)'
                                : '0 0 5px rgba(0, 102, 204, 0.3)',
                        },
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                        boxShadow: darkMode
                            ? '0 12px 40px rgba(255, 0, 255, 0.2)'
                            : '0 8px 30px rgba(139, 0, 255, 0.15)',
                    },
                },
            },
        },
        MuiModal: {
            styleOverrides: {
                root: {
                    '& .MuiPaper-root': {
                        border: darkMode 
                            ? '2px solid rgba(255, 0, 255, 0.3)'
                            : '2px solid rgba(139, 0, 255, 0.3)',
                    },
                },
            },
        },
    },
});
