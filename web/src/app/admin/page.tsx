import { Typography } from '@mui/material';
import { getSession } from '@/lib/session';

export default async function AdminDashboardPage() {
    const session = await getSession();
    // The admin user only has a single "name" attribute set (not given_name/
    // family_name), so the first name is just the first word of it. Falls back to
    // the email's local part rather than the Cognito username, which is an opaque
    // generated UUID with this pool's alias configuration, not user-facing.
    const firstName = session?.fullName?.split(' ')[0] || session?.email?.split('@')[0] || 'there';

    return (
        <>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
                Welcome, {firstName}
            </Typography>
            <Typography variant="body1" color="text.secondary">
                There&apos;s nothing to show here yet — admin features will appear in this dashboard as they&apos;re built.
            </Typography>
        </>
    );
}
