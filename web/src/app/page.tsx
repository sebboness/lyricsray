import { Box } from '@mui/material';
import { ContainerWithBackground } from '@/components/ContainerWithBackground';
import { PopularSongsServer } from '@/components/PopularSongsServer';
import { LyricsAnalysisForm } from '@/components/LyricsAnalysisForm';

export default function Home() {

    return (
        <Box sx={{ position: 'relative', minHeight: '100vh' }}>
            <ContainerWithBackground>
                {/* Popular Songs Section - Pre-loaded on server */}
                <PopularSongsServer
                    title="Popular Songs Kids Listen To"
                    maxItems={5}
                    showTitle={true}
                />

                {/* Analysis Form - Client-side interactive component */}
                <LyricsAnalysisForm />
            </ContainerWithBackground>
        </Box>
    );
}
