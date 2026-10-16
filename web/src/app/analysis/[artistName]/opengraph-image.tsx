import { getArtistAnalyses } from '@/lib/getArtistAnalyses';
import { ArtistOgCard } from '@/og/ArtistOgCard';
import { loadOgLogo } from '@/og/ogLogo';
import { OG_CACHE_SECONDS, ogNotFoundResponse, renderOgImage } from '@/og/renderOgImage';
import { OG_SIZE } from '@/og/ogStyles';
import { buildAgeBuckets, buildArtistSummary } from '@/util/artistSummary';
import { reEncodeSegment } from '@/util/routeHelper';

export const alt = 'LyricsRay artist analysis';
export const size = OG_SIZE;
export const contentType = 'image/png';

interface ImageProps {
    params: Promise<{ artistName: string }>;
}

export default async function Image({ params }: ImageProps) {
    const { artistName } = await params;
    const songs = await getArtistAnalyses(reEncodeSegment(artistName));

    if (songs.length === 0) return ogNotFoundResponse();

    return renderOgImage(
        <ArtistOgCard
            logoSrc={await loadOgLogo()}
            artistName={songs[0].artistName}
            songCount={songs.length}
            summary={buildArtistSummary(songs)}
            ageBuckets={buildAgeBuckets(songs)}
        />,
        OG_CACHE_SECONDS.artist,
    );
}
