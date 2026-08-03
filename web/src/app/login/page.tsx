'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Container, Paper, Typography } from '@mui/material';
import { LoginPasswordStep } from '@/components/admin/LoginPasswordStep';
import { LoginOtpStep } from '@/components/admin/LoginOtpStep';

export default function LoginPage() {
    const router = useRouter();
    const [challenge, setChallenge] = useState<{ username: string; session: string } | null>(null);

    return (
        <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 10, py: 8 }}>
            <Box
                component="img"
                src="/images/logo-textonly-768.png"
                alt="LyricsRay"
                sx={{ display: 'block', width: '100%', height: 'auto', mb: 3 }}
            />

            <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
                <Typography variant="h5" component="h1" sx={{ mb: 3, textAlign: 'left' }}>
                    Sign in
                </Typography>

                {!challenge ? (
                    <LoginPasswordStep onChallenge={setChallenge} />
                ) : (
                    <LoginOtpStep
                        username={challenge.username}
                        session={challenge.session}
                        onVerified={() => router.push('/admin')}
                    />
                )}
            </Paper>
        </Container>
    );
}
