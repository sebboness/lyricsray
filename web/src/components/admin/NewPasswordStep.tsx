'use client';

import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography, TextField } from '@mui/material';
import { BackToSignInLink } from './BackToSignInLink';
import { PASSWORD_RESET_REQUIRED, LoginChallenge } from '@/lib/adminChallenges';

interface NewPasswordStepProps {
    username: string;
    session: string;
    onChallenge: (params: LoginChallenge) => void;
    onLoggedIn: () => void;
    onBack: () => void;
}

export function NewPasswordStep({ username, session, onChallenge, onLoggedIn, onBack }: NewPasswordStepProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/admin/new-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, session, newPassword }),
            });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error ?? 'Could not set new password');
            }

            if (json.done) {
                onLoggedIn();
                return;
            }
            if (!json.challengeName || (json.challengeName !== PASSWORD_RESET_REQUIRED && !json.session)) {
                throw new Error('Unexpected response from server. Please contact the site administrator.');
            }

            onChallenge({ username, session: json.session, challengeName: json.challengeName });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not set new password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                    This is your first sign in. Choose a new password to continue.
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                    id="new-password"
                    label="New password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    fullWidth
                    required
                />
                <TextField
                    id="confirm-new-password"
                    label="Confirm new password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    fullWidth
                    required
                />
                <Button type="submit" variant="contained" disabled={loading} fullWidth>
                    {loading ? <CircularProgress size={24} /> : 'Continue'}
                </Button>
                <Box>
                    <BackToSignInLink onClick={onBack} />
                </Box>
            </Stack>
        </Box>
    );
}
