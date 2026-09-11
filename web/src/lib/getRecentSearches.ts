import { apiGetPublic } from '@/lib/api';
import { SongListRowItem } from '@/components/SongListRow';

export interface RecentSearchesPage {
    songs: SongListRowItem[];
    nextCursor?: string;
}

const RECENT_SEARCHES_LIMIT = 50;

export async function getRecentSearches(
    cursor?: string,
    maxItems: number = RECENT_SEARCHES_LIMIT,
    appropriate?: number,
): Promise<RecentSearchesPage> {
    try {
        const params = new URLSearchParams({ limit: String(maxItems) });
        if (cursor) params.set('cursor', cursor);
        if (appropriate !== undefined) params.set('appropriate', String(appropriate));

        const { data } = await apiGetPublic<RecentSearchesPage>(`/v1/recent-searches?${params.toString()}`);
        return { songs: data.songs ?? [], nextCursor: data.nextCursor };
    } catch (error) {
        console.error('Error fetching recent searches:', error);
        return { songs: [] };
    }
}
