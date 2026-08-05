'use client';

import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography, TextField } from '@mui/material';
import { BackToSignInLink } from './BackToSignInLink';

interface LoginOtpStepProps {
    username: string;
    session: string;
    onVerified: () => void;
    onBack: () => void;
}

export function LoginOtpStep({ username, session, onVerified, onBack }: LoginOtpStepProps) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, session, code }),
            });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error ?? 'Invalid or expired code');
            }

            onVerified();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid or expired code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                    We emailed a verification code. Enter it below to continue.
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                    id="otp-code"
                    label="Verification code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoComplete="one-time-code"
                    autoFocus
                    fullWidth
                    required
                />
                <Button type="submit" variant="contained" disabled={loading} fullWidth>
                    {loading ? <CircularProgress size={24} /> : 'Verify'}
                </Button>
                <Box>
                    <BackToSignInLink onClick={onBack} />
                </Box>
            </Stack>
        </Box>
    );
}
