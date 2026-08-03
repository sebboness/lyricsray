'use client';

import { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { AdminHeader } from './AdminHeader';
import { AdminSideNav, ADMIN_NAV_WIDTH } from './AdminSideNav';

interface AdminShellProps {
    fullName: string;
    username: string;
    children: React.ReactNode;
}

export function AdminShell({ fullName, username, children }: AdminShellProps) {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <AdminHeader
                fullName={fullName}
                username={username}
                onMenuClick={() => setMobileNavOpen((open) => !open)}
            />

            {/* Permanent nav on desktop, temporary/overlay nav on mobile */}
            <Box component="nav" sx={{ display: { xs: 'block', sm: 'none' } }}>
                <AdminSideNav variant="temporary" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
            </Box>
            <Box component="nav" sx={{ display: { xs: 'none', sm: 'block' } }}>
                <AdminSideNav variant="permanent" open onClose={() => {}} />
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { sm: `calc(100% - ${ADMIN_NAV_WIDTH}px)` },
                    p: { xs: 2, sm: 3 },
                }}
            >
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
}
