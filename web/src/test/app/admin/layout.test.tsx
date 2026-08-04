import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockGetSession, mockRedirect } = vi.hoisted(() => ({
    mockGetSession: vi.fn(),
    mockRedirect: vi.fn(() => {
        // Mirrors Next.js's real redirect(), which halts rendering by throwing —
        // without this, execution would fall through to `session.fullName` on null.
        throw new Error('NEXT_REDIRECT');
    }),
}));

vi.mock('@/lib/session', () => ({ getSession: mockGetSession }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/components/admin/AdminShell', () => ({
    AdminShell: ({ fullName, email, children }: { fullName: string; email: string; children: React.ReactNode }) => (
        <div data-testid="admin-shell" data-fullname={fullName} data-email={email}>{children}</div>
    ),
}));

import AdminLayout from '@/app/admin/layout';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('AdminLayout', () => {
    it('redirects to /login when there is no session', async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(AdminLayout({ children: <div>child</div> })).rejects.toThrow('NEXT_REDIRECT');
        expect(mockRedirect).toHaveBeenCalledWith('/login');
    });

    it('renders AdminShell with the session fields and children when a session exists', async () => {
        mockGetSession.mockResolvedValue({ userId: 'u1', email: 'admin@example.com', fullName: 'Admin Person', username: 'admin' });

        const element = await AdminLayout({ children: <div>child content</div> });
        render(element);

        const shell = screen.getByTestId('admin-shell');
        expect(shell).toHaveAttribute('data-fullname', 'Admin Person');
        expect(shell).toHaveAttribute('data-email', 'admin@example.com');
        expect(screen.getByText('child content')).toBeInTheDocument();
        expect(mockRedirect).not.toHaveBeenCalled();
    });
});
