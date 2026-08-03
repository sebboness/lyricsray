import { apiGetPublic } from '@/lib/api';

export interface RecentSearchItem {
    songKey: string;
    songName: string;
    artistName: string;
    recommendedAge: number;
    themes: string[];
    appropriate: number;
    date: string;
}

const RECENT_SEARCHES_LIMIT = 50;

export async function getRecentSearches(maxItems: number = RECENT_SEARCHES_LIMIT): Promise<RecentSearchItem[]> {
    try {
        const { data } = await apiGetPublic<{ songs: RecentSearchItem[] }>(`/v1/recent-searches?limit=${maxItems}`);
        return data.songs ?? [];
    } catch (error) {
        console.error('Error fetching recent searches:', error);
        return [];
    }
}
