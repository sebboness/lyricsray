import { SongListRowItem } from '@/components/SongListRow';
import { getAppropriatenessDisplay, getShortAgeDisplay } from '@/util/displayHelpers';

export interface AgeBucket {
    label: string;
    count: number;
    color: string;
}

/** Groups songs by their short age label, coloring each bucket by its most common verdict. */
export function buildAgeBuckets(songs: SongListRowItem[]): AgeBucket[] {
    const byLabel = new Map<string, Map<number, number>>();

    for (const song of songs) {
        const label = getShortAgeDisplay(song.recommendedAge);
        if (!byLabel.has(label)) byLabel.set(label, new Map());
        const appropriateCounts = byLabel.get(label)!;
        appropriateCounts.set(song.appropriate, (appropriateCounts.get(song.appropriate) ?? 0) + 1);
    }

    const buckets: AgeBucket[] = Array.from(byLabel.entries()).map(([label, appropriateCounts]) => {
        const [mostCommonAppropriate] = Array.from(appropriateCounts.entries()).sort((a, b) => b[1] - a[1])[0];
        const count = Array.from(appropriateCounts.values()).reduce((sum, n) => sum + n, 0);
        const display = getAppropriatenessDisplay(mostCommonAppropriate);
        return { label, count, color: display.color };
    });

    return buckets.sort((a, b) => {
        if (a.label === 'ALL') return -1;
        if (b.label === 'ALL') return 1;
        return parseInt(a.label, 10) - parseInt(b.label, 10);
    });
}

/** A short, honest, data-derived summary of an artist's analyzed songs — not a fabricated claim. */
export function buildArtistSummary(songs: SongListRowItem[]): string {
    const total = songs.length;
    const safeCount = songs.filter((s) => s.appropriate === 1).length;

    if (safeCount === total) return `All ${total} analyzed songs are safe for all ages.`;
    if (safeCount === 0) return `None of the ${total} analyzed songs are rated safe for all ages — worth a listen yourself first.`;
    return `${safeCount} of ${total} analyzed songs are safe for all ages; the rest are worth a listen first.`;
}

/** The most common themes across an artist's analyzed songs, most-frequent first. */
export function buildTopThemes(songs: SongListRowItem[], max = 6): string[] {
    const counts = new Map<string, number>();
    for (const song of songs) {
        for (const theme of song.themes) {
            const label = theme.replace(/_/g, ' ');
            counts.set(label, (counts.get(label) ?? 0) + 1);
        }
    }
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, max)
        .map(([label]) => label);
}
