import { apiGetPublic } from '@/lib/api';

export interface PopularSongItem {
    songKey: string;
    songName: string;
    artistName: string;
    recommendedAge: number;
    themes: string[];
    appropriate: number;
    date: string;
}

export async function getPopularSongs(maxItems: number = 5): Promise<PopularSongItem[]> {
    try {
        const { data } = await apiGetPublic<{ songs: PopularSongItem[] }>(`/v1/popular-songs?limit=${maxItems}`);
        return data.songs ?? [];
    } catch (error) {
        console.error('Error fetching popular songs:', error);
        return [];
    }
}
