import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

import { AdminHeader } from '@/components/admin/AdminHeader';

beforeEach(() => {
    vi.clearAllMocks();
});

function openAccountMenu() {
    // Two icon buttons exist (mobile hamburger, then the avatar) — neither has an
    // accessible name, so target by position rather than an ambiguous role query.
    const buttons = screen.getAllByRole('button');
    return userEvent.click(buttons[buttons.length - 1]);
}

describe('AdminHeader', () => {
    it('shows fullName as the title and email muted below when both are present', async () => {
        render(<AdminHeader fullName="Admin Person" email="admin@example.com" onMenuClick={vi.fn()} />);

        await openAccountMenu();

        expect(screen.getByText('Admin Person')).toBeInTheDocument();
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });

    it('falls back to email as the title and shows no duplicate line when fullName is empty', async () => {
        render(<AdminHeader fullName="" email="admin@example.com" onMenuClick={vi.fn()} />);

        await openAccountMenu();

        // Only one occurrence — no separate muted line duplicating it.
        expect(screen.getAllByText('admin@example.com')).toHaveLength(1);
    });

    it('derives the avatar initial from fullName first, falling back to email', () => {
        const { rerender } = render(<AdminHeader fullName="Admin Person" email="admin@example.com" onMenuClick={vi.fn()} />);
        expect(screen.getByText('A')).toBeInTheDocument();

        rerender(<AdminHeader fullName="" email="zed@example.com" onMenuClick={vi.fn()} />);
        expect(screen.getByText('Z')).toBeInTheDocument();
    });

    it('clears the session and redirects to /login on sign out', async () => {
        (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
        render(<AdminHeader fullName="Admin Person" email="admin@example.com" onMenuClick={vi.fn()} />);

        await openAccountMenu();
        await userEvent.click(screen.getByText('Sign out'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/admin/logout', { method: 'POST' }));
        expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('calls onMenuClick when the mobile menu icon is clicked', async () => {
        const onMenuClick = vi.fn();
        render(<AdminHeader fullName="Admin Person" email="admin@example.com" onMenuClick={onMenuClick} />);

        const buttons = screen.getAllByRole('button');
        await userEvent.click(buttons[0]);

        expect(onMenuClick).toHaveBeenCalledTimes(1);
    });
});
