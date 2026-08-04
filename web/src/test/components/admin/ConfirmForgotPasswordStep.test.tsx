import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmForgotPasswordStep } from '@/components/admin/ConfirmForgotPasswordStep';

function jsonResponse(status: number, body: unknown) {
    return { ok: status >= 200 && status < 300, json: async () => body } as Response;
}

async function fillAndSubmit(code: string, newPassword: string, confirmPassword: string) {
    await userEvent.type(screen.getByLabelText(/^Reset code/i), code);
    await userEvent.type(screen.getByLabelText(/^New password/i), newPassword);
    await userEvent.type(screen.getByLabelText(/^Confirm new password/i), confirmPassword);
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('ConfirmForgotPasswordStep', () => {
    it('rejects mismatched passwords without calling the API', async () => {
        render(<ConfirmForgotPasswordStep username="admin" onDone={vi.fn()} onBack={vi.fn()} />);

        await fillAndSubmit('1234567', 'NewStrongPass1!', 'DifferentPass1!');

        await screen.findByRole('alert');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('calls onDone on success', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { ok: true }));
        const onDone = vi.fn();
        render(<ConfirmForgotPasswordStep username="admin" onDone={onDone} onBack={vi.fn()} />);

        await fillAndSubmit('1234567', 'NewStrongPass1!', 'NewStrongPass1!');

        await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/confirm-forgot-password', expect.objectContaining({
            body: JSON.stringify({ username: 'admin', confirmationCode: '1234567', newPassword: 'NewStrongPass1!' }),
        }));
    });

    it('shows the server error message when the reset code is invalid', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(400, { error: 'Invalid or expired reset code' }));
        const onDone = vi.fn();
        render(<ConfirmForgotPasswordStep username="admin" onDone={onDone} onBack={vi.fn()} />);

        await fillAndSubmit('wrong', 'NewStrongPass1!', 'NewStrongPass1!');

        expect(await screen.findByText('Invalid or expired reset code')).toBeInTheDocument();
        expect(onDone).not.toHaveBeenCalled();
    });

    it('calls onBack when the back link is clicked', async () => {
        const onBack = vi.fn();
        render(<ConfirmForgotPasswordStep username="admin" onDone={vi.fn()} onBack={onBack} />);

        await userEvent.click(screen.getByText('Back to sign in'));

        expect(onBack).toHaveBeenCalledTimes(1);
    });
});
