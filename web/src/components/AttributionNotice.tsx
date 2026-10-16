import { Typography } from '@mui/material';
import Link from 'next/link';

export function AttributionNotice() {
    return (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Sharing this analysis? Please credit LyricsRay and link back to this page.
            See our <Link href="/privacy-and-terms">Terms of Service</Link> for details.
        </Typography>
    );
}
