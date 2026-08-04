'use client';

import { Link as MuiLink } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface BackToSignInLinkProps {
    onClick: () => void;
}

export function BackToSignInLink({ onClick }: BackToSignInLinkProps) {
    return (
        <MuiLink
            component="button"
            type="button"
            onClick={onClick}
            underline="hover"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.875rem',
                color: 'text.secondary',
            }}
        >
            <ArrowBackIcon fontSize="inherit" />
            Back to sign in
        </MuiLink>
    );
}
