'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Link,
} from '@mui/material';
import { CheckCircle, Warning, Error } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

interface PopularSongItem {
    songKey: string;
    songName: string;
    artistName: string;
    recommendedAge: number;
    appropriate: number;
    date: string;
}

interface PopularSongsProps {
    title?: string;
    maxItems?: number;
    showTitle?: boolean;
}

/**
 * Gets the appropriate icon and color based on appropriateness level
 */
const getAppropriatenessDisplay = (appropriate: number, theme: any) => {
    switch (appropriate) {
        case 1:
            return {
                icon: <CheckCircle sx={{ color: 'success.main' }} />,
                color: theme.palette.success.main,
                label: 'Parent-friendly'
            };
        case 2:
            return {
                icon: <Warning sx={{ color: 'warning.main' }} />,
                color: theme.palette.warning.main,
                label: 'Use caution'
            };
        case 3:
            return {
                icon: <Error sx={{ color: 'error.main' }} />,
                color: theme.palette.error.main,
                label: 'For mature audiences'
            };
        default:
            return {
                icon: <Error sx={{ color: 'text.secondary' }} />,
                color: theme.palette.text.secondary,
                label: 'Unknown'
            };
    }
};

export function PopularSongs({
    title = "Popular",
    maxItems = 5,
    showTitle = true
}: PopularSongsProps) {
    const theme = useTheme();
    const [PopularSongs, setPopularSongs] = useState<PopularSongItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPopularSongs();
    }, []);

    const fetchPopularSongs = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/popular-songs');

            if (!response.ok) {
                throw 'Failed to fetch popular songs';
            }

            const data: PopularSongItem[] = await response.json();
            setPopularSongs(data.slice(0, maxItems).sort(() => 0.5 - Math.random()));
        } catch (err) {
            console.error('Error fetching popular songs:', err);
            setError('Unable to load popular songs');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                {showTitle && (
                    <Typography variant="h5" fontWeight="600" mb={2}>
                        {title}
                    </Typography>
                )}
                <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                    <CircularProgress size={24} sx={{ mr: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                        Loading popular songs...
                    </Typography>
                </Box>
            </Paper>
        );
    }

    if (error || PopularSongs.length === 0) {
        return null;
    }

    return (
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            {showTitle && (
                <Typography variant="h5" fontWeight="600" mb={2}>
                    {title}
                </Typography>
            )}

            <List sx={{ py: 0 }}>
                {PopularSongs.map((analysis, index) => {
                    const display = getAppropriatenessDisplay(analysis.appropriate, theme);

                    return (
                        <ListItem
                            key={analysis.songKey}
                            sx={{
                                px: 0,
                                py: 1,
                                borderBottom: index < PopularSongs.length - 1 ? '1px solid' : 'none',
                                borderColor: 'rgba(255, 0, 255, 0.1)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 0, 255, 0.05)',
                                    borderRadius: 1,
                                },
                            }}
                        >
                            <ListItemText
                                primary={
                                    <Link
                                        href={`/analysis/${analysis.songKey}`}
                                        sx={{
                                            textDecoration: 'none',
                                            color: 'text.primary',
                                            fontWeight: 500,
                                            '&:hover': {
                                                color: 'primary.main',
                                            },
                                        }}
                                    >
                                        <strong>{analysis.songName}</strong> by {analysis.artistName}
                                    </Link>
                                }
                                secondary={
                                    <>
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            sx={{
                                                backgroundColor: `${display.color}15`,
                                                color: display.color,
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 1,
                                                fontWeight: 500,
                                                mr: 1,
                                            }}
                                        >
                                            Age {analysis.recommendedAge}+ ({display.label})
                                        </Typography>
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            sx={{
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 1,
                                                fontWeight: 500,
                                            }}
                                        >
                                            <Link href={`/analysis/${analysis.songKey}`}>
                                                Find out why &raquo;
                                            </Link>
                                        </Typography>
                                    </>
                                }
                            />
                        </ListItem>
                    );
                })}
            </List>
        </Paper>
    );
}