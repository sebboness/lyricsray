import { fetchAnalysisResult } from '@/lib/fetchAnalysisResult';
import { AnalysisOgCard } from '@/og/AnalysisOgCard';
import { loadOgLogo } from '@/og/ogLogo';
import { OG_CACHE_SECONDS, ogNotFoundResponse, renderOgImage } from '@/og/renderOgImage';
import { OG_SIZE } from '@/og/ogStyles';
import { reEncodeSegment } from '@/util/routeHelper';

export const alt = 'LyricsRay song analysis';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface ImageProps {
    params: Promise<{ artistName: string; songName: string; hash: string }>;
}

export default async function Image({ params }: ImageProps) {
    const { artistName, songName, hash } = await params;
    const songKey = [artistName, songName, hash].map(reEncodeSegment).join('/');
    const result = await fetchAnalysisResult(songKey);

    if (!result) return ogNotFoundResponse();

    return renderOgImage(
        <AnalysisOgCard
            logoSrc={await loadOgLogo()}
            songName={result.song?.songName ?? ''}
            artistName={result.song?.artistName}
            appropriate={result.appropriate}
            recommendedAge={result.recommendedAge}
            summary={result.summary}
            themes={result.themes}
            themePercentages={result.themePercentages}
        />,
        OG_CACHE_SECONDS.analysis,
    );
}
