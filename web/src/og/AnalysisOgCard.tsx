import { OgEyebrow } from '@/og/OgEyebrow';
import { OgFrame } from '@/og/OgFrame';
import { OG_COLORS, OG_FONT_MONO, getOgVerdictTokens } from '@/og/ogStyles';
import { singleLineStyle, titleFontSize, truncateText } from '@/og/ogText';
import { getAppropriatenessDisplay, getShortAgeDisplay } from '@/util/displayHelpers';
import { buildThemeBars, hasThemePercentages, type ThemePercentage } from '@/util/themeBars';
import { verdict } from '@/theme/theme';

const MAX_THEMES = 6;

const severitySegments = [
    { key: 'safe', color: verdict.safe.main },
    { key: 'caution', color: verdict.caution.main },
    { key: 'blocked', color: verdict.blocked.main },
];

export interface AnalysisOgCardProps {
    logoSrc: string;
    songName: string;
    artistName?: string;
    appropriate: number;
    recommendedAge: number | string;
    summary?: string;
    themes?: string[];
    themePercentages?: ThemePercentage[];
}

function ThemeBars({ themes, themePercentages, color }: { themes: string[]; themePercentages?: ThemePercentage[]; color: string }) {
    const bars = buildThemeBars(themes, themePercentages).slice(0, MAX_THEMES);
    const withBars = hasThemePercentages(themePercentages);

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: withBars ? 'space-between' : 'flex-start' }}>
            {bars.map(({ theme, label, percentage, relativeValue }) =>
                withBars && percentage !== undefined ? (
                    <div key={theme} style={{ display: 'flex', flexDirection: 'column', width: 520, marginBottom: 10 }}>
                        <div style={{ display: 'flex', fontSize: 22, fontWeight: 500, textTransform: 'capitalize', marginBottom: 4 }}>{label}</div>
                        <div style={{ display: 'flex', height: 8, borderRadius: 4, backgroundColor: OG_COLORS.track }}>
                            <div style={{ width: `${Math.max(relativeValue, 3)}%`, height: 8, borderRadius: 4, backgroundColor: color }} />
                        </div>
                    </div>
                ) : (
                    <div
                        key={theme}
                        style={{
                            display: 'flex',
                            fontSize: 22,
                            textTransform: 'capitalize',
                            padding: '6px 16px',
                            borderRadius: 16,
                            border: `1px solid ${OG_COLORS.border}`,
                            marginRight: 12,
                            marginBottom: 12,
                        }}
                    >
                        {label}
                    </div>
                )
            )}
        </div>
    );
}

export function AnalysisOgCard({
    logoSrc,
    songName,
    artistName,
    appropriate,
    recommendedAge,
    summary,
    themes = [],
    themePercentages,
}: AnalysisOgCardProps) {
    const display = getAppropriatenessDisplay(appropriate);
    const tokens = getOgVerdictTokens(display.verdictKey);
    const title = truncateText(songName, 70) || 'Unknown song';
    const artist = truncateText(artistName, 60);
    const showArtist = artist !== '' && artist.toLowerCase() !== 'unknown';
    const shortSummary = truncateText(summary, 110);

    return (
        <OgFrame logoSrc={logoSrc}>
            <OgEyebrow>Analysis</OgEyebrow>
            <div style={{ ...singleLineStyle, fontSize: titleFontSize(title), fontWeight: 700, letterSpacing: -2, lineHeight: 1.15, marginTop: 4 }}>
                {title}
            </div>
            {showArtist && (
                <div style={{ ...singleLineStyle, fontSize: 30, fontWeight: 500, color: OG_COLORS.brand, lineHeight: 1.2, marginTop: 4 }}>
                    {artist}
                </div>
            )}

            <div
                style={{
                    display: 'flex',
                    flexShrink: 0,
                    marginTop: 16,
                    padding: '16px 28px',
                    borderRadius: 16,
                    border: `1px solid ${tokens.border}`,
                    backgroundImage: `linear-gradient(135deg, ${tokens.surface} 0%, #0d0d14 100%)`,
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', marginRight: 36 }}>
                    <div style={{ fontFamily: OG_FONT_MONO, fontWeight: 700, fontSize: 76, lineHeight: 1, color: tokens.color }}>
                        {getShortAgeDisplay(recommendedAge)}
                    </div>
                    <div style={{ display: 'flex', marginTop: 10 }}>
                        {severitySegments.map((segment) => (
                            <div
                                key={segment.key}
                                style={{
                                    width: 36,
                                    height: 6,
                                    borderRadius: 3,
                                    marginRight: 6,
                                    backgroundColor: segment.color,
                                    opacity: segment.key === display.verdictKey ? 1 : 0.25,
                                }}
                            />
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <OgEyebrow color={tokens.color}>Verdict</OgEyebrow>
                    <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: tokens.color, marginTop: 2 }}>{display.label}</div>
                    {shortSummary && (
                        <div style={{ display: 'flex', fontSize: 22, color: OG_COLORS.textSecondary, marginTop: 4, lineHeight: 1.3 }}>
                            {shortSummary}
                        </div>
                    )}
                </div>
            </div>

            {themes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, marginTop: 16 }}>
                    <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Themes</div>
                    <ThemeBars themes={themes} themePercentages={themePercentages} color={tokens.color} />
                </div>
            )}
        </OgFrame>
    );
}
