'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Card,
    CardContent,
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Alert,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    ExpandMore,
    Security,
    Psychology,
    CheckCircle,
    AutoAwesome,
    FamilyRestroom,
    School,
    Visibility,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

export default function About() {
    const theme = useTheme();
    const [scrollY, setScrollY] = useState(0);

    // Handle scroll events for subtle parallax effect
    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <Box sx={{ position: 'relative', minHeight: '100vh' }}>
            {/* Subtle animated background elements */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `radial-gradient(circle at 10% 20%, rgba(255, 0, 255, 0.05) 0%, transparent 50%),
                               radial-gradient(circle at 90% 80%, rgba(0, 204, 255, 0.05) 0%, transparent 50%)`,
                    transform: `translateY(${scrollY * 0.1}px)`,
                    zIndex: 1,
                }}
            />

            <Container maxWidth="md" sx={{ position: 'relative', zIndex: 10, py: 8 }}>
                {/* Header Section */}
                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 3, 
                        mb: 3, 
                        borderRadius: 3,
                        textAlign: 'center'
                    }}
                >
                    <Typography variant="h1" sx={{ mb: 0, fontSize: { xs: '2.5rem', md: '3rem' } }}>
                        About
                    </Typography>
                </Paper>

                {/* Mission Section */}
                <Card sx={{ mb: 4, overflow: 'visible' }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h4" fontWeight="600">
                                Our Mission
                            </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
                            LyricsRay was created to empower parents with the tools they need to make informed decisions
                            about the media their children consume. In today&apos;s digital age, music is more accessible 
                            than ever, but not all content is suitable for young listeners. Our mission is to shed light 
                            on lyrical themes that may not be immediately apparent, helping parents navigate the complex 
                            landscape of modern music.
                        </Typography>
                    </CardContent>
                </Card>

                {/* Technology Section */}
                <Paper elevation={2} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4" fontWeight="600">
                            The Technology Behind Our Analysis
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 4, fontSize: '1.1rem' }}>
                        LyricsRay leverages Claude AI, an advanced artificial intelligence system developed by Anthropic, 
                        to perform comprehensive lyrical analysis. Our AI-powered approach examines songs across 
                        multiple dimensions:
                    </Typography>

                    {/* Content Analysis Expandable Cards */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Accordion 
                                expanded={true}
                                sx={{ 
                                    background: 'rgba(255, 0, 255, 0.05)',
                                    border: '1px solid rgba(255, 0, 255, 0.2)',
                                }}
                            >
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <AutoAwesome sx={{ color: theme.palette.primary.main }} />
                                        <Typography variant="h6" fontWeight="600">
                                            Content Analysis
                                        </Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <List dense>
                                        <ListItem>
                                            <ListItemIcon>
                                                <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Explicit Language Detection"
                                                secondary="Identifies profanity, vulgar expressions, and inappropriate language"
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemIcon>
                                                <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Mature Theme Recognition"
                                                secondary="Analyzes content for references to violence, substance abuse, sexual content, and other adult themes"
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemIcon>
                                                <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Contextual Understanding"
                                                secondary="Goes beyond keyword matching to understand meaning, metaphors, and implied content"
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemIcon>
                                                <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Cultural Sensitivity"
                                                secondary="Recognizes potentially offensive or inappropriate cultural references"
                                            />
                                        </ListItem>
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Accordion 
                                expanded={true}
                                sx={{ 
                                    background: 'rgba(0, 204, 255, 0.05)',
                                    border: '1px solid rgba(0, 204, 255, 0.2)',
                                }}
                            >
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <School sx={{ color: theme.palette.secondary.main }} />
                                        <Typography variant="h6" fontWeight="600">
                                            Age-Appropriate Recommendations
                                        </Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        Our system provides age-based recommendations by evaluating the complexity and 
                                        maturity of lyrical content, considering factors such as:
                                    </Typography>
                                    <List dense>
                                        <ListItem>
                                            <ListItemIcon>
                                                <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Emotional maturity required"
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemIcon>
                                                <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Psychological impact"
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemIcon>
                                                <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Educational value"
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemIcon>
                                                <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary="Potentially harmful content"
                                            />
                                        </ListItem>
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        </Grid>
                    </Grid>
                </Paper>

                {/* How It Works Section */}
                <Card sx={{ mb: 4 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h4" fontWeight="600">
                                How It Works
                            </Typography>
                        </Box>
                        <Grid container spacing={3}>
                            {[
                                {
                                    title: 'Song Analysis',
                                    description: 'When you search for a song or paste lyrics, our AI system processes the text using natural language understanding',
                                    icon: <Visibility />
                                },
                                {
                                    title: 'Multi-Factor Evaluation',
                                    description: 'The system examines language, themes, context, and cultural references',
                                    icon: <Psychology />
                                },
                                {
                                    title: 'Risk Assessment',
                                    description: 'Content is evaluated for potential concerns across various categories',
                                    icon: <Security />
                                },
                                {
                                    title: 'Age Recommendations',
                                    description: 'Based on the analysis, we provide suggested minimum age ranges and detailed explanations',
                                    icon: <FamilyRestroom />
                                }
                            ].map((step, index) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={index}>
                                    <Card 
                                        sx={{ 
                                            height: '100%',
                                            background: `linear-gradient(135deg, rgba(${index % 2 === 0 ? '255, 0, 255' : '0, 204, 255'}, 0.05), transparent)`,
                                            border: `1px solid rgba(${index % 2 === 0 ? '255, 0, 255' : '0, 204, 255'}, 0.2)`,
                                            transition: 'transform 0.2s ease-in-out',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                            }
                                        }}
                                    >
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                {step.icon}
                                                <Typography variant="h6" fontWeight="600" sx={{ ml: 1 }}>
                                                    {step.title}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {step.description}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>

                {/* Why This Matters Section */}
                <Card sx={{ mb: 4 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h4" fontWeight="600">
                                Why This Matters
                            </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ mb: 3, fontSize: '1.1rem' }}>
                            Modern media moves fast, and keeping up with every song, artist, and trend can be 
                            overwhelming for parents. Many popular songs contain mature themes wrapped in catchy 
                            melodies, making potentially inappropriate content appealing to young listeners. LyricsRay 
                            helps bridge this gap by:
                        </Typography>
                        <Grid container spacing={2}>
                            {[
                                'Revealing hidden or subtle mature themes in popular music',
                                'Providing objective analysis free from marketing influence',
                                'Offering age-appropriate guidance based on content analysis',
                                'Empowering parents to make informed decisions quickly and efficiently'
                            ].map((benefit, index) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={index}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                                        <Typography variant="body2">
                                            {benefit}
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>

                {/* Final Commitment Section */}
                <Card sx={{ mb: 4 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h4" fontWeight="600">
                                Our Commitment
                            </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ mb: 3, fontSize: '1.1rem' }}>
                            We believe that informed parents make better decisions. LyricsRay is designed to be a 
                            helpful resource in your parenting journey, providing transparency about the content your 
                            children encounter while respecting your role as the ultimate decision-maker for your family.
                        </Typography>
                        
                        <Divider sx={{ my: 3, borderColor: 'rgba(255, 0, 255, 0.3)' }} />
                        
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                fontWeight: 600,
                            }}
                        >
                            Remember: You know your child best. Use LyricsRay as a tool to inform your decisions, but 
                            always trust your parental instincts and family values when determining what&apos;s right 
                            for your children, and consider whether the themes portraied in popular media is appropriate.
                        </Typography>
                    </CardContent>
                </Card>

                {/* Important Disclaimers Section */}
                <Card sx={{ mb: 4 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h4" fontWeight="600">
                                Important Disclaimers
                            </Typography>
                        </Box>

                        <Box sx={{ mb: 4 }}>
                            <Alert severity="warning" sx={{ mb: 3, fontSize: '1rem' }}>
                                <Typography variant="h6" sx={{ mb: 1 }}>
                                    Parental Judgment is Essential
                                </Typography>
                                While LyricsRay provides valuable insights into lyrical content, <strong>parents should 
                                    always use their own judgment</strong> when making decisions about what is 
                                    appropriate for their children. Every child is unique, with different maturity 
                                    levels, sensitivities, and family values that our technology cannot fully account for.
                            </Alert>

                            <Alert severity="info" sx={{ mb: 3, fontSize: '1rem' }}>
                                <Typography variant="h6" sx={{ mb: 1 }}>
                                    Not a Substitute for Professional Guidance
                                </Typography>
                                LyricsRay and the AI technology behind it <strong>are not replacements for therapists, 
                                counselors, or other mental health professionals</strong>. If you have concerns about 
                                how media content might affect your child&apos;s emotional or psychological well-being, 
                                we encourage you to consult with qualified professionals.
                            </Alert>

                            <Alert severity="error" sx={{ fontSize: '1rem' }}>
                                <Typography variant="h6" sx={{ mb: 1 }}>
                                    Technology Limitations
                                </Typography>
                                <Typography variant="body2">
                                    While Claude AI is highly advanced, no automated system is perfect. Our analysis:
                                </Typography>
                                <List dense sx={{ mt: 1 }}>
                                    <ListItem sx={{ py: 0 }}>
                                        <ListItemText 
                                            primary="• May occasionally miss subtle references or cultural nuances"
                                            sx={{ margin: 0 }}
                                        />
                                    </ListItem>
                                    <ListItem sx={{ py: 0 }}>
                                        <ListItemText 
                                            primary="• Cannot account for individual family values and standards"
                                            sx={{ margin: 0 }}
                                        />
                                    </ListItem>
                                    <ListItem sx={{ py: 0 }}>
                                        <ListItemText 
                                            primary="• Should be considered one tool among many in your parenting toolkit"
                                            sx={{ margin: 0 }}
                                        />
                                    </ListItem>
                                </List>
                            </Alert>
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}
