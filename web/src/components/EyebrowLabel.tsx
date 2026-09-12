'use client';

import { styled } from '@mui/material/styles';
import Typography, { TypographyProps } from '@mui/material/Typography';
import { labelSx } from '@/theme/theme';

// Cast back to `typeof Typography` — styled() otherwise drops Typography's
// polymorphic `component` prop from the resulting component's type.
const StyledEyebrow = styled(Typography)(() => ({ ...labelSx })) as typeof Typography;

/** Small mono uppercase eyebrow label, e.g. "VERDICT", "WHAT'S IN IT", "FLAGGED LINES". */
export function EyebrowLabel({ component = 'span', ...props }: TypographyProps) {
    return <StyledEyebrow component={component} {...props} />;
}
