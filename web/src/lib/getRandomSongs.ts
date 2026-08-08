import { apiGetPublic } from '@/lib/api';
import { SongListRowItem } from '@/components/SongListRow';

export async function getRandomSongs(excludeSongKey: string): Promise<SongListRowItem[]> {
    try {
        const { data } = await apiGetPublic<{ songs: SongListRowItem[] }>(
            `/v1/random-songs?excludeSongKey=${encodeURIComponent(excludeSongKey)}`
        );
        return data.songs ?? [];
    } catch (error) {
        console.error('Error fetching random songs:', error);
        return [];
    }
}
