'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AppBar,
    Avatar,
    Box,
    IconButton,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { ADMIN_NAV_WIDTH } from './AdminSideNav';

interface AdminHeaderProps {
    fullName: string;
    username: string;
    onMenuClick: () => void;
}

export function AdminHeader({ fullName, username, onMenuClick }: AdminHeaderProps) {
    const router = useRouter();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handleLogout = async () => {
        setAnchorEl(null);
        await fetch('/api/admin/logout', { method: 'POST' });
        router.push('/login');
    };

    const initial = (fullName || username || '?').charAt(0).toUpperCase();

    return (
        <AppBar
            position="fixed"
            sx={{
                width: { sm: `calc(100% - ${ADMIN_NAV_WIDTH}px)` },
                ml: { sm: `${ADMIN_NAV_WIDTH}px` },
            }}
        >
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={onMenuClick}
                        sx={{ display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div">
                        LyricsRay Admin
                    </Typography>
                </Box>

                <Box>
                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0 }}>
                        <Avatar>{initial}</Avatar>
                    </IconButton>
                    <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
                        <Box sx={{ px: 2, py: 1 }}>
                            <Typography variant="subtitle2">{fullName || username}</Typography>
                            {username && (
                                <Typography variant="caption" color="text.secondary">
                                    {username}
                                </Typography>
                            )}
                        </Box>
                        <MenuItem onClick={handleLogout}>Sign out</MenuItem>
                    </Menu>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
