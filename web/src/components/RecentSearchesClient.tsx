'use client';

import { Paper, List } from '@mui/material';
import { SongListRow, SongListRowItem } from './SongListRow';

interface RecentSearchesClientProps {
    songs: SongListRowItem[];
}

export function RecentSearchesClient({ songs }: RecentSearchesClientProps) {
    if (songs.length === 0) {
        return null;
    }

    return (
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <List sx={{ py: 0 }}>
                {songs.map((song, index) => (
                    <SongListRow
                        key={song.songKey}
                        song={song}
                        index={index}
                        total={songs.length}
                        showDate
                    />
                ))}
            </List>
        </Paper>
    );
}
