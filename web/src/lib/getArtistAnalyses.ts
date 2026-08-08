import { apiGetPublic } from '@/lib/api';
import { SongListRowItem } from '@/components/SongListRow';

export async function getArtistAnalyses(artistKey: string): Promise<SongListRowItem[]> {
    try {
        const { data } = await apiGetPublic<{ songs: SongListRowItem[] }>(
            `/v1/artist-analyses?artistKey=${encodeURIComponent(artistKey)}`
        );
        return data.songs ?? [];
    } catch (error) {
        console.error('Error fetching artist analyses:', error);
        return [];
    }
}
