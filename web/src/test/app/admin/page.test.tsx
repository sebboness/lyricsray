import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }));

vi.mock('@/lib/session', () => ({ getSession: mockGetSession }));

import AdminDashboardPage from '@/app/admin/page';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('AdminDashboardPage', () => {
    it('greets the user by their first name, derived from fullName', async () => {
        mockGetSession.mockResolvedValue({ userId: 'u1', email: 'admin@example.com', fullName: 'Admin Person', username: 'admin' });

        render(await AdminDashboardPage());

        expect(screen.getByText('Welcome, Admin')).toBeInTheDocument();
    });

    it('falls back to the email local part when fullName is empty', async () => {
        mockGetSession.mockResolvedValue({ userId: 'u1', email: 'zed@example.com', fullName: '', username: 'some-uuid' });

        render(await AdminDashboardPage());

        expect(screen.getByText('Welcome, zed')).toBeInTheDocument();
    });

    it('falls back to "there" when neither fullName nor email is available', async () => {
        mockGetSession.mockResolvedValue(null);

        render(await AdminDashboardPage());

        expect(screen.getByText('Welcome, there')).toBeInTheDocument();
    });
});
