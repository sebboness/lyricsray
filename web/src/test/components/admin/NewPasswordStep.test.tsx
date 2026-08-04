import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewPasswordStep } from '@/components/admin/NewPasswordStep';

function jsonResponse(status: number, body: unknown) {
    return { ok: status >= 200 && status < 300, json: async () => body } as Response;
}

async function fillAndSubmit(newPassword: string, confirmPassword: string) {
    await userEvent.type(screen.getByLabelText(/^New password/i), newPassword);
    await userEvent.type(screen.getByLabelText(/^Confirm new password/i), confirmPassword);
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('NewPasswordStep', () => {
    it('rejects mismatched passwords without calling the API', async () => {
        render(
            <NewPasswordStep username="admin" session="sess-123" onChallenge={vi.fn()} onLoggedIn={vi.fn()} onBack={vi.fn()} />,
        );

        await fillAndSubmit('NewStrongPass1!', 'DifferentPass1!');

        await screen.findByRole('alert');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('calls onChallenge with the follow-up EMAIL_OTP session on success', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { done: false, challengeName: 'EMAIL_OTP', session: 'sess-456' }));
        const onChallenge = vi.fn();
        render(
            <NewPasswordStep username="admin" session="sess-123" onChallenge={onChallenge} onLoggedIn={vi.fn()} onBack={vi.fn()} />,
        );

        await fillAndSubmit('NewStrongPass1!', 'NewStrongPass1!');

        await waitFor(() => expect(onChallenge).toHaveBeenCalledWith({
            username: 'admin', session: 'sess-456', challengeName: 'EMAIL_OTP',
        }));
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/new-password', expect.objectContaining({
            body: JSON.stringify({ username: 'admin', session: 'sess-123', newPassword: 'NewStrongPass1!' }),
        }));
    });

    it('calls onLoggedIn when no further challenge follows', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { done: true }));
        const onLoggedIn = vi.fn();
        render(
            <NewPasswordStep username="admin" session="sess-123" onChallenge={vi.fn()} onLoggedIn={onLoggedIn} onBack={vi.fn()} />,
        );

        await fillAndSubmit('NewStrongPass1!', 'NewStrongPass1!');

        await waitFor(() => expect(onLoggedIn).toHaveBeenCalledTimes(1));
    });

    it('shows the server error message when the new password is rejected', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(400, { error: 'Password does not meet the required complexity' }));
        render(
            <NewPasswordStep username="admin" session="sess-123" onChallenge={vi.fn()} onLoggedIn={vi.fn()} onBack={vi.fn()} />,
        );

        await fillAndSubmit('weak', 'weak');

        expect(await screen.findByText('Password does not meet the required complexity')).toBeInTheDocument();
    });

    it('calls onBack when the back link is clicked', async () => {
        const onBack = vi.fn();
        render(
            <NewPasswordStep username="admin" session="sess-123" onChallenge={vi.fn()} onLoggedIn={vi.fn()} onBack={onBack} />,
        );

        await userEvent.click(screen.getByText('Back to sign in'));

        expect(onBack).toHaveBeenCalledTimes(1);
    });
});
