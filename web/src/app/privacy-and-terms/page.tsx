'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Link,
} from '@mui/material';
import { Shield, CheckCircle } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

export default function PrivacyTerms() {
    const theme = useTheme();
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <Box sx={{ position: 'relative', minHeight: '100vh' }}>
            {/* Subtle animated background */}
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
                {/* Header */}
                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 3, 
                        mb: 2, 
                        borderRadius: 3,
                        textAlign: 'center'
                    }}
                >
                    <Typography variant="h1" sx={{ mb: 0, fontSize: { xs: '2rem', md: '2.5rem' } }}>
                        Privacy Policy & Terms of Service
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Last updated: November 21, 2025
                    </Typography>
                </Paper>

                {/* Agreement Notice */}
                <Paper elevation={2} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="600">
                            Your agreement
                        </Typography>
                    </Box>
                    <Typography variant="body1">
                        By using LyricsRay, you agree to the terms and policies outlined on this page. 
                        If you do not agree with these terms, please discontinue use of our service.
                    </Typography>
                </Paper>

                {/* Privacy Policy Section */}
                <Paper elevation={2} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Shield sx={{ color: theme.palette.primary.main, mr: 1.5 }} />
                        <Typography variant="h4" fontWeight="600">
                            Privacy policy
                        </Typography>
                    </Box>

                    <Typography variant="h6" fontWeight="600" sx={{ mt: 2, mb: 2 }}>
                        Information we collect
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        LyricsRay is committed to protecting your privacy. We collect minimal information 
                        necessary to provide our service:
                    </Typography>
                    <List>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText 
                                primary="IP address for rate limiting"
                                secondary="We collect your IP address solely to implement rate limiting and prevent abuse of our service. This helps ensure fair access for all users and protects against automated attacks."
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText 
                                primary="Theme preference"
                                secondary="Your light/dark mode preference is stored locally in your browser using localStorage. This data never leaves your device."
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText 
                                primary="Analysis data"
                                secondary="When you submit lyrics for analysis, we process: child's age, song name (if provided), artist name (if provided), and lyrics content. This information is used only to generate the analysis results. The analysis results are stored in a database for later retrieval."
                            />
                        </ListItem>
                    </List>

                    <Typography variant="h6" fontWeight="600" sx={{ mt: 2, mb: 2 }}>
                        How we use your information
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Your information is used exclusively for the following purposes:
                    </Typography>
                    <List>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText
                                primary="Your IP address is used for rate limiting in order to prevent service abuse"
                                secondary="Specifically there is a limit on how often the service can be used per unique user. The IP address is unique to your device and/or network."
                            />
                        </ListItem>
                    </List>

                    <Typography variant="h6" fontWeight="600" sx={{ mt: 2, mb: 2 }}>
                        What we don&apos;t collect
                    </Typography>
                    <List>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText 
                                primary="No personal identification"
                                secondary="We do not collect names, email addresses, phone numbers, or any personally identifiable information (PII)."
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText 
                                primary="No tracking cookies"
                                secondary="We do not use tracking cookies, advertising cookies, or any third-party analytics cookies."
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText 
                                primary="No account system"
                                secondary="LyricsRay does not require user accounts or login credentials, although this may change in a future release of the app. This page will be updated once user accounts are enabled."
                            />
                        </ListItem>
                    </List>

                    <Typography variant="h6" fontWeight="600" sx={{ mt: 2, mb: 2 }}>
                        Data linking
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Your IP address is <strong>not linked</strong> to any personally identifiable information. 
                        It is used strictly for rate limiting purposes and is not associated with your analysis 
                        requests, theme preferences, or any other data that could identify you as an individual.
                    </Typography>

                    <Typography variant="h6" fontWeight="600" sx={{ mt: 2, mb: 2 }}>
                        Data storage and security
                    </Typography>
                    <Typography variant="body1">
                        IP addresses used for rate limiting are stored temporarily and automatically expire. 
                        Analysis data related to a song and its lyric content is processed in real-time and permanently
                        stored on our servers. We implement industry-standard security measures to protect all data transmission.
                    </Typography>
                </Paper>

                {/* Terms of Service Section */}
                <Paper elevation={2} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
                    <Typography variant="h4" fontWeight="600" sx={{ mb: 2 }}>
                        Terms of service
                    </Typography>

                    <Typography variant="h6" fontWeight="600" sx={{ mt: 2, mb: 2 }}>
                        Service description
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        LyricsRay provides AI-powered analysis of song lyrics to help parents make informed 
                        decisions about age-appropriate content for their children. The service is currently 
                        offered on a free-to-try basis, with plans to implement a pay-as-you-go model in the future.
                    </Typography>

                    <Typography variant="h6" fontWeight="600" sx={{ mt: 2, mb: 2 }}>
                        Acceptable use
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        You agree to use LyricsRay only for its intended purpose. Prohibited activities include:
                    </Typography>
                    <List>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary="Attempting to abuse, exploit, or overwhelm our service" />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary="Using automated tools or scripts to make excessive requests" />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary="Attempting to reverse engineer or extract our AI analysis methods" />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary="Using the service for any illegal or unauthorized purpose" />
                        </ListItem>
                    </List>

                    <Typography variant="h6" fontWeight="600" sx={{ mt: 2, mb: 2 }}>
                        Service limitations
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        LyricsRay is provided as-is without warranties of any kind. While we strive for accuracy:
                    </Typography>
                    <List>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary="AI analysis may not catch all inappropriate content" />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary="Results are advisory and not definitive judgments" />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary="Parents maintain full responsibility for content decisions" />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <CheckCircle sx={{ color: 'primary.main', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary="Service availability is not guaranteed" />
                        </ListItem>
                    </List>

                    <Typography variant="h6" fontWeight="600" sx={{ mt: 2, mb: 2 }}>
                        Third-party services
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        LyricsRay uses Claude AI by Anthropic for lyric analysis and may use third-party 
                        services for song lyric retrieval. We are not affiliated with any media corporations, 
                        record labels, streaming services, or entertainment businesses.
                    </Typography>

                    <Typography variant="h6" fontWeight="600" sx={{ mt: 2, mb: 2 }}>
                        Disclaimer of liability
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        LyricsRay and its creators are not liable for decisions made based on our analysis. 
                        The service is a tool to inform parental decisions, not a substitute for parental 
                        judgment or professional guidance. We make no guarantees about the accuracy or 
                        completeness of analysis results.
                    </Typography>

                    <Typography variant="h6" fontWeight="600" sx={{ mt: 2, mb: 2 }}>
                        Changes to terms
                    </Typography>
                    <Typography variant="body1">
                        We reserve the right to modify these terms and our privacy policy at any time. 
                        Continued use of LyricsRay after changes constitutes acceptance of updated terms. 
                        Material changes will be reflected in the &quot;Last updated&quot; date at the top of this page.
                    </Typography>
                </Paper>

                {/* Contact Section */}
                <Card sx={{ mb: 4 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Typography variant="h5" fontWeight="600" sx={{ mb: 2 }}>
                            Questions or concerns?
                        </Typography>
                        <Typography variant="body1">
                            If you have questions about our privacy practices or terms of service, please visit the creators
                            of this app (<a href="https://hexonite.net" target="_blank" rel="noopener noreferrer">Hexonite</a>) for 
                            more information about LyricsRay and our mission. Read more about how this app works on 
                            our <Link href="/about">About</Link> page.
                        </Typography>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}