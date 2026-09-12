'use client';

import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import { verdict } from '@/theme/theme';
import type { VerdictKey } from '@/util/displayHelpers';

const verdictTokens: Record<VerdictKey, { border: string; surface: string }> = {
    safe: { border: verdict.safe.border, surface: verdict.safe.surface },
    caution: { border: verdict.caution.border, surface: verdict.caution.surface },
    blocked: { border: verdict.blocked.border, surface: verdict.blocked.surface },
    unknown: { border: '#23242f', surface: '#14151d' },
};

interface StyledVerdictCardProps {
    verdictKey: VerdictKey;
}

/**
 * Card with a subtle colored wash + border matching a verdict. Used for the
 * big analysis result card ("VERDICT" + age + summary).
 */
export const VerdictCard = styled(Paper, {
    shouldForwardProp: (prop) => prop !== 'verdictKey',
})<StyledVerdictCardProps>(({ verdictKey }) => {
    const tokens = verdictTokens[verdictKey];

    return {
        padding: 24,
        borderRadius: 14,
        border: `1px solid ${tokens.border}`,
        background: `linear-gradient(135deg, ${tokens.surface} 0%, rgba(10, 10, 16, 0.4) 100%)`,
    };
});
