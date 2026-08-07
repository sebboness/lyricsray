'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';

export const ADMIN_NAV_WIDTH = 240;

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

// Placeholder for now — no admin features exist yet. Add future items here
// (e.g. usage statistics) without touching AdminSideNav's rendering logic.
const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: <DashboardIcon /> },
];

interface AdminSideNavProps {
    variant: 'permanent' | 'temporary';
    open: boolean;
    onClose: () => void;
}

export function AdminSideNav({ variant, open, onClose }: AdminSideNavProps) {
    const pathname = usePathname();

    const content = (
        <List>
            {NAV_ITEMS.map((item) => (
                <ListItemButton
                    key={item.href}
                    component={Link}
                    href={item.href}
                    selected={pathname === item.href}
                    onClick={onClose}
                >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                </ListItemButton>
            ))}
        </List>
    );

    return (
        <Drawer
            variant={variant}
            open={variant === 'permanent' ? true : open}
            onClose={onClose}
            ModalProps={{ keepMounted: true }}
            sx={{
                width: ADMIN_NAV_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': { width: ADMIN_NAV_WIDTH, boxSizing: 'border-box' },
            }}
        >
            <Box
                component={Link}
                href="/"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 64,
                    px: 2,
                    textDecoration: 'none',
                }}
            >
                <Box
                    component="img"
                    src="/images/logo-textonly-64.png"
                    alt="LyricsRay"
                    sx={{ maxHeight: 32, width: 'auto' }}
                />
            </Box>
            {content}
        </Drawer>
    );
}
