'use client';

import { Box, Button, Modal, Typography } from '@mui/material';
import Close from '@mui/icons-material/Close';
import { LyricsPaper } from './LyricsPaper';
import { ExplicitContentGate } from './ExplicitContentGate';

interface LyricsModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    artist?: string;
    lyrics?: string;
    isMature: boolean;
}

/**
 * A popup showing a song's full lyrics, gated behind ExplicitContentGate when
 * the song is rated mature. Shared by the analysis form's "Show full lyrics"
 * link and any other place that needs the same lyrics popup.
 */
export function LyricsModal({ open, onClose, title, artist, lyrics, isMature }: LyricsModalProps) {
    return (
        <Modal open={open} onClose={onClose}>
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: { xs: '90%', sm: 500, md: 800 },
                    maxHeight: '80vh',
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: '0 0 50px rgba(255, 0, 255, 0.3)',
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        p: 2,
                        borderBottom: 1,
                        borderColor: 'rgba(255, 0, 255, 0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.1), rgba(0, 204, 255, 0.1))',
                    }}
                >
                    <Typography variant="h6" component="h2">
                        {title || 'Unknown song'} by {artist || 'Unknown artist'}
                    </Typography>
                    <Button variant="contained" onClick={onClose} size="small" sx={{ minWidth: 'auto', p: 1 }}>
                        <Close />
                    </Button>
                </Box>
                <Box sx={{ maxHeight: 500, maxWidth: 800, overflow: 'auto', p: 2 }}>
                    {!lyrics ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            No lyrics to show :(
                        </Typography>
                    ) : isMature ? (
                        <ExplicitContentGate>{() => <LyricsPaper lyrics={lyrics} />}</ExplicitContentGate>
                    ) : (
                        <LyricsPaper lyrics={lyrics} />
                    )}
                </Box>
            </Box>
        </Modal>
    );
}
