import NextLink from 'next/link';
import { Button, Container, Grid, Typography } from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';

interface HomeHeroProps {
    /** The analyze form, rendered in the left column under the hero copy. */
    children: React.ReactNode;
    /** The "What kids are playing" list + about blurb, rendered in the right column. */
    sidebar: React.ReactNode;
}

/** Home page two-column layout: hero copy + analyze form on the left, sidebar content on the right. */
export function HomeHero({ children, sidebar }: HomeHeroProps) {
    return (
        <Container maxWidth="md" sx={{ py: { xs: 4, sm: 8 } }}>
            <Grid container spacing={{ xs: 5, md: 6 }}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <Typography variant="h1" sx={{ fontSize: { xs: '2rem', sm: '2.75rem' }, mb: 2 }}>
                        Is this song safe for your kid?
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480 }}>
                        Paste a title or the lyrics. You get an age, a verdict, and the reason behind it, in any language, without an account.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 480 }}>
                        LyricsRay evaluates songs for explicit language, mature themes, and age-appropriate content using AI-powered lyrics analysis.
                    </Typography>

                    <Button
                        component={NextLink}
                        href="/about"
                        variant="outlined"
                        size="small"
                        endIcon={<InfoOutlined />}
                        sx={{ mt: 2.5, mb: 4 }}
                    >
                        About
                    </Button>

                    {children}
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                    {sidebar}
                </Grid>
            </Grid>
        </Container>
    );
}
