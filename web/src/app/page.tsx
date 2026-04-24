import { ContainerWithBackground } from '@/components/ContainerWithBackground';
import { PopularSongsClient } from '@/components/PopularSongsClient';
import { LyricsAnalysisForm } from '@/components/LyricsAnalysisForm';
import { getPopularSongs } from '@/lib/getPopularSongs';

export const dynamic = 'force-dynamic';

export default async function Home() {

    // Fetch popular songs data on the server
    const popularSongs = await getPopularSongs(5);

    return (
        <div style={{ position: 'relative', minHeight: '100vh' }}>
            <ContainerWithBackground>
                {/* Popular Songs Section - Pre-loaded on server, rendered on client */}
                <PopularSongsClient
                    title="Popular songs kids listen to"
                    showTitle={true}
                    songs={popularSongs}
                />

                {/* Analysis Form - Client-side interactive component */}
                <LyricsAnalysisForm />
            </ContainerWithBackground>
        </div>
    );
}
