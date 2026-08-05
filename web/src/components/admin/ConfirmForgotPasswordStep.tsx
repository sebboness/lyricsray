'use client';

import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography, TextField } from '@mui/material';
import { BackToSignInLink } from './BackToSignInLink';

interface ConfirmForgotPasswordStepProps {
    username: string;
    onDone: () => void;
    onBack: () => void;
}

export function ConfirmForgotPasswordStep({ username, onDone, onBack }: ConfirmForgotPasswordStepProps) {
    const [confirmationCode, setConfirmationCode] = useState('');
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
            const res = await fetch('/api/admin/confirm-forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, confirmationCode, newPassword }),
            });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error ?? 'Could not reset password');
            }

            onDone();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                    Enter the code emailed to you along with a new password.
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                    id="reset-code"
                    label="Reset code"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    autoComplete="one-time-code"
                    autoFocus
                    fullWidth
                    required
                />
                <TextField
                    id="new-password"
                    label="New password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
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
                    {loading ? <CircularProgress size={24} /> : 'Reset password'}
                </Button>
                <Box>
                    <BackToSignInLink onClick={onBack} />
                </Box>
            </Stack>
        </Box>
    );
}
