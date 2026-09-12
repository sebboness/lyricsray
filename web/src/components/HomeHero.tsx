import NextLink from 'next/link';
import { Box, Button, Container, Grid, Typography } from '@mui/material';
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
        <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 8 } }}>
            <Grid container spacing={{ xs: 5, md: 6 }}>
                <Grid size={{ xs: 12, md: 7 }}>
                    {/* Mobile: logo beside the title only; subtitle spans full width below */}
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 2, alignItems: 'flex-start', mb: 2 }}>
                        <Box
                            component="img"
                            src="/images/logo.svg"
                            alt=""
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                flexShrink: 0,
                            }}
                        />
                        <Typography variant="h1" sx={{ fontSize: '2rem' }}>
                            Is this song safe for your kid?
                        </Typography>
                    </Box>
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ display: { xs: 'block', md: 'none' } }}
                    >
                        Paste a title or the lyrics. You get an age, a verdict, and the reason behind it, in any language, without an account.
                    </Typography>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: { xs: 'block', md: 'none' }, mt: 1.5, mb: 2 }}
                    >
                        LyricsRay evaluates songs for explicit language, mature themes, and age-appropriate content using AI-powered lyrics analysis.
                    </Typography>

                    {/* Desktop: logo beside title + both paragraphs */}
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: 'flex-start', mb: 2 }}>
                        <Box
                            component="img"
                            src="/images/logo.svg"
                            alt=""
                            sx={{
                                width: 180,
                                height: 180,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                flexShrink: 0,
                            }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="h1" sx={{ fontSize: '2.75rem' }}>
                                Is this song safe for your kid?
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 480 }}>
                                Paste a title or the lyrics. You get an age, a verdict, and the reason behind it, in any language, without an account.
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 480 }}>
                                LyricsRay evaluates songs for explicit language, mature themes, and age-appropriate content using AI-powered lyrics analysis.
                            </Typography>
                        </Box>
                    </Box>

                    <Button
                        component={NextLink}
                        href="/about"
                        variant="outlined"
                        size="small"
                        endIcon={<InfoOutlined />}
                        sx={{ mb: 4 }}
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
