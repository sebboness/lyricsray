'use client';

import { useState } from 'react';
import {
    Box,
    Modal,
    Typography,
    IconButton,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    Close,
    ContentCopy,
    Check,
    Facebook,
    X,
    Email,
    WhatsApp,
    Share,
} from '@mui/icons-material';
import { getAnalysisDetailsPath } from '@/util/routeHelper';

interface ShareButtonWithModalProps  {
    age: number;
    songKey: string;
    songTitle?: string;
    artistName?: string;
}

export function ShareButtonWithModal({
    age,
    songKey, 
    songTitle = 'this song',
    artistName = 'Unknown Artist'
}: ShareButtonWithModalProps ) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    
    const shareUrl = getAnalysisDetailsPath(songKey);
    
    // Share text for social media
    const shareText = `Check out this lyrics analysis for "${songTitle}" by ${artistName} and if it's age-appropriate for a ${age} year-old on LyricsRay!`;
    
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    const handleShare = (platform: string) => {
        let url = '';
        
        switch (platform) {
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                break;
            case 'twitter':
                url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
                break;
            case 'whatsapp':
                url = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
                break;
            case 'email':
                url = `mailto:?subject=${encodeURIComponent('LyricsRay Analysis - ' + songTitle)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
                break;
        }
        
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleClose = () => {
        setOpen(false);
        setCopied(false);
    };

    // Share platform configurations
    const sharePlatforms = [
        {
            name: 'WhatsApp',
            icon: <WhatsApp />,
            color: '#25D366',
            platform: 'whatsapp'
        },
        {
            name: 'Facebook',
            icon: <Facebook />,
            color: '#1877F2',
            platform: 'facebook'
        },
        {
            name: 'X',
            icon: <X />,
            color: '#000000',
            platform: 'twitter'
        },
        {
            name: 'Email',
            icon: <Email />,
            color: '#EA4335',
            platform: 'email'
        }
    ];

    return (
        <>
            {/* Share Button */}
            <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center"
                sx={{ cursor: 'pointer' }}
                onClick={() => setOpen(true)}
            >
                <IconButton 
                    aria-label="share"
                    size="small"
                    component="span"
                >
                    <Share sx={{ fontSize: 36 }} />
                </IconButton>
                <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ mt: -0.5 }}
                >
                    Share
                </Typography>
            </Box>

            {/* Share Modal */}
            <Modal open={open} onClose={handleClose}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: { xs: '90%', sm: 450 },
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: '0 0 50px rgba(255, 0, 255, 0.3)',
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <Box sx={{ 
                        p: 2, 
                        borderBottom: 1, 
                        borderColor: 'rgba(255, 0, 255, 0.2)', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.1), rgba(0, 204, 255, 0.1))',
                    }}>
                        <Typography variant="h6" component="h2" fontWeight="600">
                            Share analysis results
                        </Typography>
                        <IconButton 
                            onClick={handleClose} 
                            size="small" 
                            sx={{ minWidth: 'auto', p: 1 }}
                        >
                            <Close />
                        </IconButton>
                    </Box>

                    {/* Content */}
                    <Box sx={{ p: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Share the analysis for <strong>{songTitle}</strong> by <strong>{artistName}</strong>
                        </Typography>

                        {/* Circular Share Buttons */}
                        <Box sx={{ 
                            display: 'flex', 
                            gap: 3, 
                            justifyContent: 'center',
                            mb: 3 
                        }}>
                            {sharePlatforms.map((platform) => (
                                <Box
                                    key={platform.platform}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 1
                                    }}
                                >
                                    <IconButton
                                        onClick={() => handleShare(platform.platform)}
                                        sx={{
                                            width: 56,
                                            height: 56,
                                            bgcolor: platform.color,
                                            color: '#e4e4e4',
                                            '&:hover': {
                                                bgcolor: platform.color,
                                                color: '#fff',
                                            },
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {platform.icon}
                                    </IconButton>
                                    <Typography 
                                        variant="caption" 
                                        color="text.secondary"
                                        sx={{ fontSize: '0.75rem' }}
                                    >
                                        {platform.name}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>

                        {/* Copy Link Section */}
                        <Box>
                            <TextField
                                fullWidth
                                value={shareUrl}
                                size="small"
                                slotProps={{
                                    input: {
                                        readOnly: true,
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={handleCopyLink}
                                                    edge="end"
                                                    color={copied ? 'success' : 'primary'}
                                                    size="small"
                                                >
                                                    {copied ? <Check /> : <ContentCopy />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: 'rgba(0, 0, 0, 0.02)',
                                        fontSize: '0.875rem'
                                    }
                                }}
                            />
                            <Typography 
                                variant="caption" 
                                color="success.main" 
                                sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}
                            >
                                {copied ? "Link copied to clipboard!" : <>&nbsp;</>}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Modal>
        </>
    );
}