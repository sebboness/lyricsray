import { apiGetPublic } from '@/lib/api';
import { SongListRowItem } from '@/components/SongListRow';

const RECENT_SEARCHES_LIMIT = 50;

export async function getRecentSearches(maxItems: number = RECENT_SEARCHES_LIMIT): Promise<SongListRowItem[]> {
    try {
        const { data } = await apiGetPublic<{ songs: SongListRowItem[] }>(`/v1/recent-searches?limit=${maxItems}`);
        return data.songs ?? [];
    } catch (error) {
        console.error('Error fetching recent searches:', error);
        return [];
    }
}
