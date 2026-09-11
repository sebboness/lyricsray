'use client';

import {
    Backdrop,
    Box,
    CircularProgress,
    Container,
    Typography,
} from '@mui/material';

type LoadingType = 'searching' | 'analyzing';

interface LoadingAnalysisModalProps  {
    open: boolean;
    type: LoadingType;
}

const searchingText = {
    'searching': 'Searching for song...',
    'analyzing': 'Analyzing lyrics...',
};

export function LoadingAnalysisModal({
    open,
    type,
}: LoadingAnalysisModalProps ) {
    return (
        <Backdrop
            sx={(theme) => ({ zIndex: theme.zIndex.drawer + 1 })}
            open={open}
        >
            <Container 
                maxWidth="sm" 
                sx={{ p: 4 }}
            >
                <Box display="flex" flexDirection="column" alignItems="center">
                    <Box
                        component="img"
                        src="/images/logo-transparent-no-text-512.png"
                        alt="LyricsRay Logo"
                        sx={{
                            width: '100%',
                            maxWidth: '512px',
                            height: 'auto',
                            display: 'block',
                        }}
                    />

                    <Box
                        display="flex"
                        flexDirection="row"
                        alignItems="center"
                        justifyContent="center"
                        gap={2}
                        
                    >
                        <CircularProgress sx={{ color: "#fff" }} />

                        <Typography color="#fff" variant="h5" fontWeight="600" mb={0}>
                            {searchingText[type]}
                        </Typography>
                    </Box>
                </Box>
            </Container>
        </Backdrop>
    );
}