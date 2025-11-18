'use client';

import { useState } from 'react';
import {
    Box,
    Modal,
    Typography,
    Button,
    IconButton,
    TextField,
    InputAdornment,
    Divider,
} from '@mui/material';
import {
    Close,
    ContentCopy,
    Check,
    Facebook,
    X,
    LinkedIn,
    Email,
    WhatsApp,
    Share,
} from '@mui/icons-material';
import { logger } from '@/logger/logger';

interface ShareButtonWithModalProps  {
    songKey: string;
    songTitle?: string;
    artistName?: string;
}

export function ShareButtonWithModal({
    songKey, 
    songTitle = 'this song',
    artistName = 'Unknown Artist'
}: ShareButtonWithModalProps ) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // Construct the full URL
    const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_BASE_URL || '';
    const shareUrl = `${baseUrl}/analysis/${encodeURIComponent(songKey)}`;
    
    // Share text for social media
    const shareText = `Check out this lyrics analysis for "${songTitle}" by ${artistName} on LyricsRay!`;
    
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            logger.error('Failed to copy link:', error);
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
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
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
        setCopied(false); // Reset copied state when closing
    };

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
                    width: { xs: '90%', sm: 500 },
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
                            Share Analysis Results
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
                        {/* Song Info */}
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Share the analysis for <strong>{songTitle}</strong> by <strong>{artistName}</strong>
                        </Typography>

                        {/* Copy Link Section */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1 }}>
                                Copy Link
                            </Typography>
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
                                    }
                                }}
                            />
                            {copied && (
                                <Typography 
                                    variant="caption" 
                                    color="success.main" 
                                    sx={{ display: 'block', mt: 0.5 }}
                                >
                                    Link copied to clipboard!
                                </Typography>
                            )}
                        </Box>

                        <Divider sx={{ my: 3 }}>
                            <Typography variant="caption" color="text.secondary">
                                OR SHARE VIA
                            </Typography>
                        </Divider>

                        {/* Social Media Buttons */}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                startIcon={<Facebook />}
                                onClick={() => handleShare('facebook')}
                                sx={{ 
                                    flex: '1 1 auto',
                                    minWidth: 120,
                                    borderColor: '#1877F2',
                                    color: '#1877F2',
                                    '&:hover': {
                                        borderColor: '#1877F2',
                                        bgcolor: 'rgba(24, 119, 242, 0.1)',
                                    }
                                }}
                            >
                                Facebook
                            </Button>
                            
                            <Button
                                variant="outlined"
                                startIcon={<X />}
                                onClick={() => handleShare('twitter')}
                                sx={{ 
                                    flex: '1 1 auto',
                                    minWidth: 120,
                                    borderColor: '#1DA1F2',
                                    color: '#1DA1F2',
                                    '&:hover': {
                                        borderColor: '#1DA1F2',
                                        bgcolor: 'rgba(29, 161, 242, 0.1)',
                                    }
                                }}
                            >
                                Twitter
                            </Button>
                            
                            <Button
                                variant="outlined"
                                startIcon={<WhatsApp />}
                                onClick={() => handleShare('whatsapp')}
                                sx={{ 
                                    flex: '1 1 auto',
                                    minWidth: 120,
                                    borderColor: '#25D366',
                                    color: '#25D366',
                                    '&:hover': {
                                        borderColor: '#25D366',
                                        bgcolor: 'rgba(37, 211, 102, 0.1)',
                                    }
                                }}
                            >
                                WhatsApp
                            </Button>
                            
                            <Button
                                variant="outlined"
                                startIcon={<LinkedIn />}
                                onClick={() => handleShare('linkedin')}
                                sx={{ 
                                    flex: '1 1 auto',
                                    minWidth: 120,
                                    borderColor: '#0A66C2',
                                    color: '#0A66C2',
                                    '&:hover': {
                                        borderColor: '#0A66C2',
                                        bgcolor: 'rgba(10, 102, 194, 0.1)',
                                    }
                                }}
                            >
                                LinkedIn
                            </Button>
                            
                            <Button
                                variant="outlined"
                                startIcon={<Email />}
                                onClick={() => handleShare('email')}
                                sx={{ 
                                    flex: '1 1 auto',
                                    minWidth: 120,
                                }}
                            >
                                Email
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Modal>
        </>
    );
}