import { apiGetPublic } from '@/lib/api';
import { SongListRowItem } from '@/components/SongListRow';

export async function getPopularSongs(maxItems: number = 5): Promise<SongListRowItem[]> {
    try {
        const { data } = await apiGetPublic<{ songs: SongListRowItem[] }>(`/v1/popular-songs?limit=${maxItems}`);
        return data.songs ?? [];
    } catch (error) {
        console.error('Error fetching popular songs:', error);
        return [];
    }
}
