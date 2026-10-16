import type { ReactNode } from 'react';
import { OG_COLORS, OG_FONT_MONO, OG_FONT_SANS, OG_SIZE } from '@/og/ogStyles';

interface OgFrameProps {
    logoSrc: string;
    children: ReactNode;
}

/** Shared card chrome: dark background plus the LyricsRay logo and title across the top. */
export function OgFrame({ logoSrc, children }: OgFrameProps) {
    return (
        <div
            style={{
                width: OG_SIZE.width,
                height: OG_SIZE.height,
                display: 'flex',
                flexDirection: 'column',
                padding: '32px 56px',
                backgroundColor: OG_COLORS.background,
                backgroundImage: 'linear-gradient(135deg, #14122b 0%, #0a0a10 55%)',
                color: OG_COLORS.textPrimary,
                fontFamily: OG_FONT_SANS,
            }}
        >
            <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoSrc} width={60} height={60} alt="" style={{ borderRadius: 30, marginRight: 18 }} />
                    <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>LyricsRay</div>
                </div>
                <div
                    style={{
                        fontFamily: OG_FONT_MONO,
                        fontSize: 18,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        color: OG_COLORS.textSecondary,
                    }}
                >
                    Is this song safe for my child?
                </div>
            </div>
            {children}
        </div>
    );
}
