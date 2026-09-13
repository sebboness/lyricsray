'use client';

import { usePathname, useRouter } from "next/navigation";
import {
    Box,
    Container,
    AppBar,
    Toolbar,
    Link,
    Typography,
    Button,
    BottomNavigation,
    BottomNavigationAction,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { KO_FI_LINK } from '@/util/supportDev';
import { TrackedExternalLink } from '@/components/TrackedExternalLink';
import { trackEvent } from '@/util/trackEvent';
import ScanField from '@/components/ScanField';

interface ClientLayoutProps {
    children: React.ReactNode;
}

const BOTTOM_NAV_HEIGHT = 68;

const navLinks = [
    { href: '/', label: 'Analyze' },
    { href: '/recent-searches', label: 'Recent' },
    { href: '/about', label: 'About' },
];

const bottomNavItems = [
    { href: '/', label: 'Analyze', icon: <DocumentScannerIcon /> },
    { href: '/recent-searches', label: 'Recent', icon: <StarBorderIcon /> },
    { href: '/about', label: 'About', icon: <InfoOutlinedIcon /> },
];

export function ClientLayout({ children }: ClientLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isAdminArea = pathname === "/login" || pathname.startsWith("/admin");
    const activeBottomNavValue = bottomNavItems.find((item) =>
        item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
    )?.href ?? false;

    // Admin area has its own chrome (AdminShell) — skip the public nav/footer entirely.
    if (isAdminArea) {
        return <>{children}</>;
    }

    return (
        <>
            {/* Dim logo watermark, top-right, fixed so it stays put while the page scrolls.
                Rendered outside the overflow:hidden shell below — an overflow:hidden ancestor
                clips fixed-position descendants to its own box in every major browser, which
                would otherwise make this disappear/stop tracking on pages taller than one screen. */}
            <Box
                component="img"
                src="/images/logo.svg"
                alt=""
                aria-hidden
                sx={{
                    position: 'fixed',
                    top: { xs: 20, sm: 10, md: 0 },
                    right: { xs: 0, sm: 10, md: 30 },
                    width: { xs: 200, sm: 300, md: 420 },
                    height: 'auto',
                    opacity: 0.06,
                    zIndex: -1,
                    pointerEvents: 'none',
                }}
            />

            <Box sx={{
                position: 'relative',
                zIndex: 0,
                overflow: 'hidden',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <ScanField variant={isMobile ? 'mobile' : 'desktop'} />

                {/* Header */}
                <AppBar position="sticky" sx={{ top: 0 }}>
                    <Container maxWidth="lg">
                        <Toolbar sx={{ justifyContent: 'space-between', gap: 2, px: { xs: 0 } }}>
                            <Link
                                href="/"
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    color: 'text.primary',
                                    textDecoration: 'none',
                                }}
                            >
                                <Box
                                    component="img"
                                    src="/images/logo-shield-64.png"
                                    alt=""
                                    sx={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        objectPosition: 'top',
                                        flexShrink: 0,
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: '0.9375rem',
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    Lyrics
                                    <Box component="span" sx={{ color: '#9d90ff' }}>
                                        Ray
                                    </Box>
                                </Typography>
                            </Link>

                            <Box
                                sx={{
                                    display: { xs: 'none', sm: 'flex' },
                                    alignItems: 'center',
                                    gap: 3,
                                    flex: 1,
                                    ml: 2,
                                }}
                            >
                                {navLinks.map((navLink) => {
                                    const isActive = navLink.href === '/'
                                        ? pathname === '/'
                                        : pathname.startsWith(navLink.href);

                                    return (
                                        <Link
                                            key={navLink.href}
                                            href={navLink.href}
                                            sx={{
                                                color: isActive ? 'text.primary' : 'text.secondary',
                                                fontWeight: isActive ? 600 : 500,
                                                fontSize: '0.875rem',
                                                textDecoration: isActive ? 'underline' : 'none',
                                                textUnderlineOffset: '6px',
                                                '&:hover': { color: 'text.primary' },
                                            }}
                                        >
                                            {navLink.label}
                                        </Link>
                                    );
                                })}
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                        trackEvent('externalLink', { linkTarget: 'kofi-profile', linkContext: 'header' });
                                        window.open(KO_FI_LINK, '_blank', 'noopener,noreferrer');
                                    }}
                                    sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                                >
                                    Support on Ko-fi
                                </Button>
                            </Box>
                        </Toolbar>
                    </Container>
                </AppBar>

                {/* Main Content */}
                <Box sx={{ flex: 1, pb: { xs: `${BOTTOM_NAV_HEIGHT}px`, sm: 0 } }}>
                    {children}
                </Box>

                {/* Footer */}
                <Box
                    component="footer"
                    sx={{
                        mt: 'auto',
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        pt: 3,
                        pb: { xs: `${BOTTOM_NAV_HEIGHT + 24}px`, sm: 3 },
                    }}
                >
                    <Container maxWidth="lg">
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            rowGap: 0.5,
                            columnGap: 1,
                            textAlign: 'center',
                        }}>
                            <Link
                                href="/about"
                                color="text.secondary"
                                sx={{ fontSize: '0.875rem', '&::after': { content: '"·"', ml: 1, color: 'text.secondary' } }}
                            >
                                About
                            </Link>
                            <Link
                                href="/privacy-and-terms"
                                color="text.secondary"
                                sx={{ fontSize: '0.875rem', '&::after': { content: '"·"', ml: 1, color: 'text.secondary' } }}
                            >
                                Privacy &amp; Terms
                            </Link>
                            <TrackedExternalLink
                                href="https://www.hexonite.net/sebastian"
                                linkTarget="hexonite"
                                linkContext="footer"
                                color="text.secondary"
                                sx={{
                                    fontSize: '0.875rem',
                                    display: { xs: 'none', sm: 'inline' },
                                    '&::after': { content: '"·"', ml: 1, color: 'text.secondary' },
                                }}
                            >
                                Thoughtfully created by Sebastian Stefaniuk
                            </TrackedExternalLink>
                            <TrackedExternalLink
                                href={KO_FI_LINK}
                                linkTarget="kofi-profile"
                                linkContext="footer"
                                color="text.secondary"
                                sx={{ fontSize: '0.875rem' }}
                            >
                                Help keep this free
                            </TrackedExternalLink>
                        </Box>
                        <TrackedExternalLink
                            href="https://www.hexonite.net/sebastian"
                            linkTarget="hexonite"
                            linkContext="footer"
                            color="text.secondary"
                            sx={{ display: { xs: 'block', sm: 'none' }, fontSize: '0.875rem', textAlign: 'center', mt: 0.5 }}
                        >
                            Thoughtfully created by Sebastian Stefaniuk
                        </TrackedExternalLink>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', textAlign: 'center', mt: 2 }}
                        >
                            © {new Date().getFullYear()} LyricsRay. AI-powered lyric analysis for child safety.
                        </Typography>
                    </Container>
                </Box>

                {/* Mobile bottom navigation */}
                <BottomNavigation
                    showLabels
                    value={activeBottomNavValue}
                    onChange={(_, value) => router.push(value)}
                    sx={{
                        display: { xs: 'flex', sm: 'none' },
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: (theme) => theme.zIndex.appBar,
                    }}
                >
                    {bottomNavItems.map((item) => (
                        <BottomNavigationAction
                            key={item.href}
                            label={item.label}
                            icon={item.icon}
                            value={item.href}
                        />
                    ))}
                </BottomNavigation>
            </Box>
        </>
    );
}
