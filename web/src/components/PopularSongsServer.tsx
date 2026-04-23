import {
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Link,
} from '@mui/material';
import { CheckCircle, Warning, Error } from '@mui/icons-material';
import { getDynamoDbClient } from '@/storage/dynamodb';
import { AnalysisResultStorage } from '@/storage/AnalysisResultStorage';

interface PopularSongItem {
    songKey: string;
    songName: string;
    artistName: string;
    recommendedAge: number;
    appropriate: number;
    date: string;
}

interface PopularSongsServerProps {
    title?: string;
    maxItems?: number;
    showTitle?: boolean;
}

/**
 * Gets the appropriate icon and color based on appropriateness level
 */
const getAppropriatenessDisplay = (appropriate: number) => {
    switch (appropriate) {
        case 1:
            return {
                icon: <CheckCircle sx={{ color: 'success.main' }} />,
                colorClass: 'success.main',
                label: 'Parent-friendly'
            };
        case 2:
            return {
                icon: <Warning sx={{ color: 'warning.main' }} />,
                colorClass: 'warning.main',
                label: 'Use caution'
            };
        case 3:
            return {
                icon: <Error sx={{ color: 'error.main' }} />,
                colorClass: 'error.main',
                label: 'For mature audiences'
            };
        default:
            return {
                icon: <Error sx={{ color: 'text.secondary' }} />,
                colorClass: 'text.secondary',
                label: 'Unknown'
            };
    }
};

async function getPopularSongs(maxItems: number = 5): Promise<PopularSongItem[]> {
    try {
        const ddbClient = getDynamoDbClient();
        const analysisResultDb = new AnalysisResultStorage(ddbClient);

        const recentAnalyses = await analysisResultDb.getRecentAnalyses(20, "POPULAR");

        if (!recentAnalyses || recentAnalyses.length === 0) {
            return [];
        }

        // Transform the data for the frontend
        const formattedAnalyses: PopularSongItem[] = recentAnalyses
            .filter(item =>
                item.song?.songName &&
                item.song?.artistName &&
                item.recommendedAge &&
                item.appropriate &&
                item.date
            )
            .map(item => ({
                songKey: item.songKey,
                songName: item.song.songName || 'Unknown Song',
                artistName: item.song.artistName || 'Unknown Artist',
                recommendedAge: item.recommendedAge,
                appropriate: item.appropriate,
                date: item.date
            }));

        // Randomize and limit results
        return formattedAnalyses.slice(0, maxItems).sort(() => 0.5 - Math.random());
    } catch (error) {
        console.error('Error fetching popular songs:', error);
        return [];
    }
}

export async function PopularSongsServer({
    title = "Popular",
    maxItems = 5,
    showTitle = true
}: PopularSongsServerProps) {
    const popularSongs = await getPopularSongs(maxItems);

    if (popularSongs.length === 0) {
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
                {popularSongs.map((analysis, index) => {
                    const display = getAppropriatenessDisplay(analysis.appropriate);

                    return (
                        <ListItem
                            key={analysis.songKey}
                            sx={{
                                px: 0,
                                py: 1,
                                borderBottom: index < popularSongs.length - 1 ? '1px solid' : 'none',
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
                                                backgroundColor: display.colorClass === 'success.main' ? 'rgba(46, 125, 50, 0.15)' :
                                                                  display.colorClass === 'warning.main' ? 'rgba(237, 108, 2, 0.15)' :
                                                                  display.colorClass === 'error.main' ? 'rgba(211, 47, 47, 0.15)' :
                                                                  'rgba(128, 128, 128, 0.15)',
                                                color: display.colorClass,
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