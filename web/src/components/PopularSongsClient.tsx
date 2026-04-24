'use client';

import {
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Link,
} from '@mui/material';
import { CheckCircle, Warning, Error } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { PopularSongItem } from '@/lib/getPopularSongs';

interface PopularSongsClientProps {
    title?: string;
    showTitle?: boolean;
    songs: PopularSongItem[];
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

export function PopularSongsClient({
    title = "Popular",
    showTitle = true,
    songs
}: PopularSongsClientProps) {
    const theme = useTheme();

    if (songs.length === 0) {
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
                {songs.map((analysis, index) => {
                    const display = getAppropriatenessDisplay(analysis.appropriate, theme);

                    return (
                        <ListItem
                            key={analysis.songKey}
                            sx={{
                                px: 0,
                                py: 1,
                                borderBottom: index < songs.length - 1 ? '1px solid' : 'none',
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