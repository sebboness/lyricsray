'use client';

import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { verdict } from '@/theme/theme';
import type { VerdictKey } from '@/util/displayHelpers';

const unknownColor = '#8a939e';

const verdictColors: Record<VerdictKey, string> = {
    safe: verdict.safe.main,
    caution: verdict.caution.main,
    blocked: verdict.blocked.main,
    unknown: unknownColor,
};

interface StyledAgeBadgeProps {
    verdictColor: string;
    badgeSize: 'small' | 'large';
}

const StyledAgeBadge = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'verdictColor' && prop !== 'badgeSize',
})<StyledAgeBadgeProps>(({ verdictColor, badgeSize }) => ({
    display: 'inline-flex',
    alignItems: 'baseline',
    fontWeight: 700,
    color: verdictColor,
    fontFamily: 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, monospace',
    ...(badgeSize === 'small'
        ? {
            fontSize: '0.8125rem',
            lineHeight: 1.4,
            padding: '2px 8px',
            borderRadius: 6,
            backgroundColor: `${verdictColor}1f`,
            border: `1px solid ${verdictColor}55`,
        }
        : {
            fontSize: '2.75rem',
            lineHeight: 1,
        }),
}));

interface AgeBadgeProps {
    verdictKey: VerdictKey;
    children: React.ReactNode;
    /** 'small' for list-row pills, 'large' for the standalone verdict-card age number. Defaults to 'small'. */
    size?: 'small' | 'large';
    className?: string;
}

/** Age display badge, colored by verdict. Small = list-row pill, large = the big verdict-card number. */
export function AgeBadge({ verdictKey, children, size = 'small', className }: AgeBadgeProps) {
    return (
        <StyledAgeBadge verdictColor={verdictColors[verdictKey]} badgeSize={size} className={className}>
            {children}
        </StyledAgeBadge>
    );
}
