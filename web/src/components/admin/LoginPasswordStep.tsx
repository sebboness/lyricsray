'use client';

import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField } from '@mui/material';
import { PASSWORD_RESET_REQUIRED, LoginChallenge } from '@/lib/adminChallenges';

interface LoginPasswordStepProps {
    onChallenge: (params: LoginChallenge) => void;
    onLoggedIn: () => void;
}

export function LoginPasswordStep({ onChallenge, onLoggedIn }: LoginPasswordStepProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error ?? 'Invalid username or password');
            }

            if (json.done) {
                onLoggedIn();
                return;
            }
            // PASSWORD_RESET_REQUIRED carries no session — it isn't part of the
            // InitiateAuth/RespondToAuthChallenge flow, unlike every other challenge.
            if (!json.challengeName || (json.challengeName !== PASSWORD_RESET_REQUIRED && !json.session)) {
                throw new Error('Unexpected response from server. Please contact the site administrator.');
            }

            onChallenge({ username, session: json.session, challengeName: json.challengeName });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                    id="username"
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    fullWidth
                    required
                />
                <TextField
                    id="password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    fullWidth
                    required
                />
                <Button type="submit" variant="contained" disabled={loading} fullWidth>
                    {loading ? <CircularProgress size={24} /> : 'Continue'}
                </Button>
            </Stack>
        </Box>
    );
}
