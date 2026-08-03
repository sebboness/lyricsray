import { Typography } from '@mui/material';
import { getSession } from '@/lib/session';

export default async function AdminDashboardPage() {
    const session = await getSession();

    return (
        <>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
                Welcome, {session?.fullName || session?.username}
            </Typography>
            <Typography variant="body1" color="text.secondary">
                There&apos;s nothing to show here yet — admin features will appear in this dashboard as they&apos;re built.
            </Typography>
        </>
    );
}
