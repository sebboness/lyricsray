import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginOtpStep } from '@/components/admin/LoginOtpStep';

function jsonResponse(status: number, body: unknown) {
    return { ok: status >= 200 && status < 300, json: async () => body } as Response;
}

async function fillAndSubmit(code: string) {
    await userEvent.type(screen.getByLabelText(/^Verification code/i), code);
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('LoginOtpStep', () => {
    it('calls onVerified on a successful code', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { ok: true }));
        const onVerified = vi.fn();
        render(<LoginOtpStep username="admin" session="sess-123" onVerified={onVerified} onBack={vi.fn()} />);

        await fillAndSubmit('123456');

        await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/verify', expect.objectContaining({
            body: JSON.stringify({ username: 'admin', session: 'sess-123', code: '123456' }),
        }));
    });

    it('shows the server error message on an invalid code', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(400, { error: 'Invalid or expired code' }));
        const onVerified = vi.fn();
        render(<LoginOtpStep username="admin" session="sess-123" onVerified={onVerified} onBack={vi.fn()} />);

        await fillAndSubmit('000000');

        expect(await screen.findByText('Invalid or expired code')).toBeInTheDocument();
        expect(onVerified).not.toHaveBeenCalled();
    });

    it('calls onBack when the back link is clicked', async () => {
        const onBack = vi.fn();
        render(<LoginOtpStep username="admin" session="sess-123" onVerified={vi.fn()} onBack={onBack} />);

        await userEvent.click(screen.getByText('Back to sign in'));

        expect(onBack).toHaveBeenCalledTimes(1);
    });
});
