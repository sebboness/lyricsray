'use client';

import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField } from '@mui/material';

interface LoginPasswordStepProps {
    onChallenge: (params: { username: string; session: string }) => void;
}

export function LoginPasswordStep({ onChallenge }: LoginPasswordStepProps) {
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
            if (!json.challengeName || !json.session) {
                throw new Error('Unexpected response from server. Please contact the site administrator.');
            }

            onChallenge({ username, session: json.session });
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
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    fullWidth
                    required
                />
                <TextField
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
