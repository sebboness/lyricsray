import { OgEyebrow } from '@/og/OgEyebrow';
import { OgFrame } from '@/og/OgFrame';
import { OG_COLORS, OG_FONT_MONO } from '@/og/ogStyles';
import { singleLineStyle, titleFontSize, truncateText } from '@/og/ogText';
import type { AgeBucket } from '@/util/artistSummary';

export interface ArtistOgCardProps {
    logoSrc: string;
    artistName: string;
    songCount: number;
    summary: string;
    ageBuckets: AgeBucket[];
}

export function ArtistOgCard({ logoSrc, artistName, songCount, summary, ageBuckets }: ArtistOgCardProps) {
    const name = truncateText(artistName, 50) || 'Unknown artist';

    return (
        <OgFrame logoSrc={logoSrc}>
            <OgEyebrow>Artist</OgEyebrow>
            <div style={{ ...singleLineStyle, fontSize: titleFontSize(name) + 16, fontWeight: 700, letterSpacing: -2, lineHeight: 1.15, marginTop: 6 }}>
                {name}
            </div>
            <div style={{ fontSize: 30, color: OG_COLORS.textSecondary, marginTop: 10 }}>
                {`${songCount} ${songCount === 1 ? 'song' : 'songs'} analyzed`}
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: 36,
                    padding: '32px 36px',
                    borderRadius: 16,
                    border: `1px solid ${OG_COLORS.border}`,
                    backgroundColor: OG_COLORS.paper,
                }}
            >
                <div style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.25, marginBottom: 28 }}>{truncateText(summary, 140)}</div>
                <OgEyebrow>Age spread</OgEyebrow>
                <div style={{ display: 'flex', marginTop: 14, marginBottom: 20 }}>
                    {ageBuckets.map((bucket, index) => (
                        <div
                            key={bucket.label}
                            style={{
                                flex: bucket.count,
                                height: 16,
                                borderRadius: 8,
                                backgroundColor: bucket.color,
                                marginRight: index === ageBuckets.length - 1 ? 0 : 6,
                            }}
                        />
                    ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {ageBuckets.map((bucket) => (
                        <div key={bucket.label} style={{ display: 'flex', alignItems: 'center', marginRight: 32 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: bucket.color, marginRight: 10 }} />
                            <div style={{ fontFamily: OG_FONT_MONO, fontSize: 24, color: OG_COLORS.textSecondary }}>
                                {`${bucket.label === 'ALL' ? 'All ages' : bucket.label} · ${bucket.count}`}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </OgFrame>
    );
}
