import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (!session) redirect('/login');

    return (
        <AdminShell fullName={session.fullName} email={session.email}>
            {children}
        </AdminShell>
    );
}
