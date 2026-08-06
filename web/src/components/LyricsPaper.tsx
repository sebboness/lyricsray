import { Paper, Typography } from '@mui/material';

interface LyricsPaperProps {
    lyrics: string;
}

export function LyricsPaper({ lyrics }: LyricsPaperProps) {
    return (
        <Paper
            sx={{
                p: 3,
                maxHeight: 400,
                overflow: 'auto',
                bgcolor: 'rgba(0, 0, 0, 0.02)',
            }}
        >
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}
            >
                {lyrics}
            </Typography>
        </Paper>
    );
}
