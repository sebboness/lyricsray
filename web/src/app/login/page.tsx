'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Container, Paper, Typography } from '@mui/material';
import { LoginPasswordStep } from '@/components/admin/LoginPasswordStep';
import { NewPasswordStep } from '@/components/admin/NewPasswordStep';
import { ConfirmForgotPasswordStep } from '@/components/admin/ConfirmForgotPasswordStep';
import { LoginOtpStep } from '@/components/admin/LoginOtpStep';
import { PASSWORD_RESET_REQUIRED, LoginChallenge } from '@/lib/adminChallenges';

type LoginStep =
    | { step: 'password' }
    | { step: 'newPassword'; username: string; session: string }
    | { step: 'passwordReset'; username: string }
    | { step: 'otp'; username: string; session: string };

export default function LoginPage() {
    const router = useRouter();
    const [state, setState] = useState<LoginStep>({ step: 'password' });
    const [resetSuccess, setResetSuccess] = useState(false);

    const handleChallenge = (params: LoginChallenge) => {
        if (params.challengeName === PASSWORD_RESET_REQUIRED) {
            setState({ step: 'passwordReset', username: params.username });
        } else if (params.challengeName === 'NEW_PASSWORD_REQUIRED') {
            setState({ step: 'newPassword', username: params.username, session: params.session ?? '' });
        } else {
            setState({ step: 'otp', username: params.username, session: params.session ?? '' });
        }
    };

    const backToSignIn = () => {
        setState({ step: 'password' });
        setResetSuccess(false);
    };
    const passwordWasReset = () => {
        setState({ step: 'password' });
        setResetSuccess(true);
    };
    const loggedIn = () => router.push('/admin');

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

                {state.step === 'password' && (
                    <>
                        {resetSuccess && (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                Password updated. Sign in with your new password.
                            </Alert>
                        )}
                        <LoginPasswordStep onChallenge={handleChallenge} onLoggedIn={loggedIn} />
                    </>
                )}

                {state.step === 'newPassword' && (
                    <NewPasswordStep
                        username={state.username}
                        session={state.session}
                        onChallenge={handleChallenge}
                        onLoggedIn={loggedIn}
                        onBack={backToSignIn}
                    />
                )}

                {state.step === 'passwordReset' && (
                    <ConfirmForgotPasswordStep
                        username={state.username}
                        onDone={passwordWasReset}
                        onBack={backToSignIn}
                    />
                )}

                {state.step === 'otp' && (
                    <LoginOtpStep
                        username={state.username}
                        session={state.session}
                        onVerified={loggedIn}
                        onBack={backToSignIn}
                    />
                )}
            </Paper>
        </Container>
    );
}
