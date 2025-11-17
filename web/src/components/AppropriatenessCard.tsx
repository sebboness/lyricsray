// components/AppropriatenessCard.tsx
import { Box, Card, CardContent, IconButton, Link, Typography } from '@mui/material';
import { CheckCircle, Error, Share, WarningRounded } from '@mui/icons-material';

interface AppropriatenessCardProps {
    appropriate: number;
    recommendedAge: number;
    size?: 'small' | 'medium' | 'large';
    songKey?: string;
}

interface AppropriateData {
    icon: React.JSX.Element;
    color: string;
    text: string;
}

/**
 * Gets display data based on appropriateness level
 * @param appropriate The appropriateness level as an integer
 * @param iconSize
 * @returns Data based on appropriateness level
 */
const getAppropriateData = (appropriate: number, iconSize: number): AppropriateData => {
    let icon = <></>;
    let color = '';
    let text = '';

    switch (appropriate) {
        case 1:
            icon = <CheckCircle sx={{ color: 'success.main', fontSize: iconSize }} />;
            color = 'success.main';
            text = 'Appropriate for your child';
            break;
        case 2:
            icon = <WarningRounded sx={{ color: 'warning.main', fontSize: iconSize }} />;
            color = 'warning.main';
            text = 'Contains themes that may not be appropriate for your child';
            break;
        case 3:
            icon = <Error sx={{ color: 'error.main', fontSize: iconSize }} />;
            color = 'error.main';
            text = 'May not be appropriate for your child';
            break;
        default:
            icon = <Error sx={{ color: 'text.secondary', fontSize: iconSize }} />;
            color = 'text.secondary';
            text = 'Unable to determine appropriateness';
            break;
    }

    return { icon, color, text };
};

export function AppropriatenessCard({ 
    appropriate, 
    recommendedAge, 
    size = 'medium',
    songKey,
}: AppropriatenessCardProps) {
    // Size configurations
    const sizeConfig = {
        small: { icon: 36, titleVariant: 'h6' as const, gap: 2 },
        medium: { icon: 48, titleVariant: 'h5' as const, gap: 3 },
        large: { icon: 64, titleVariant: 'h4' as const, gap: 4 },
    };

    const config = sizeConfig[size];
    const appropriatenessData = getAppropriateData(appropriate, config.icon);

    return (
        <Card sx={{ mb: 2 }}>
            <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    {/* Left side: Icon and text */}
                    <Box display="flex" alignItems="center" gap={2}>
                        {(appropriatenessData.icon)}
                        <Box gap={2}>
                            <Typography 
                                variant="h6" 
                                color={appropriatenessData.color}
                                fontWeight="600"
                            >
                                {appropriatenessData.text}
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                                <strong>Recommended age:</strong> {recommendedAge}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Right side: Share button */}
                    {songKey && (<Link 
                        href={`/analysis/${encodeURIComponent(songKey)}`} // your actual route
                        style={{ textDecoration: 'none' }}
                    >
                        <Box 
                            display="flex" 
                            flexDirection="column" 
                            alignItems="center"
                        >
                            <IconButton 
                                aria-label="share"
                                size="small"
                            >
                                <Share sx={{ fontSize: 36 }} />
                            </IconButton>
                            <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ mt: -0.5 }}
                            >
                                Share
                            </Typography>
                        </Box>
                    </Link>)}
                </Box>
            </CardContent>
        </Card>
    );
}