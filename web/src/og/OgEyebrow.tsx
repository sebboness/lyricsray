import { OG_COLORS, OG_FONT_MONO } from '@/og/ogStyles';

interface OgEyebrowProps {
    children: string;
    color?: string;
}

/** Small mono uppercase label, mirroring the site's EyebrowLabel. */
export function OgEyebrow({ children, color = OG_COLORS.textPrimary }: OgEyebrowProps) {
    return (
        <div
            style={{
                display: 'flex',
                flexShrink: 0,
                fontFamily: OG_FONT_MONO,
                fontSize: 20,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color,
            }}
        >
            {children}
        </div>
    );
}
