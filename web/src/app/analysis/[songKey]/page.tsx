'use client';

import {
    Box,
    Container,
    Typography,
    Paper,
    Card,
    CardContent,
} from '@mui/material';
import { logger } from '@/logger/logger';

interface AnalysisPageProps {
  params: {
    songKey: string;
  };
}

export default function Analysis({ params }: AnalysisPageProps) {
    logger.info(`songKey is ${params.songKey}`);

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
                        Analysis for &hellip;
                    </Typography>
                </Paper>

                {/* Analysis Section */}
                <Card sx={{ mb: 4, overflow: 'visible' }}>
                    <CardContent sx={{ p: 4 }}>
                        <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
                            &hellip;
                        </Typography>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}
