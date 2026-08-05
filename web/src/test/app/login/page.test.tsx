import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

import LoginPage from '@/app/login/page';

function jsonResponse(status: number, body: unknown) {
    return { ok: status >= 200 && status < 300, json: async () => body } as Response;
}

async function submitPassword(username = 'admin', password = 'correct-password') {
    await userEvent.type(screen.getByLabelText(/^Username/i), username);
    await userEvent.type(screen.getByLabelText(/^Password/i), password);
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('LoginPage', () => {
    it('goes through password -> EMAIL_OTP -> verified and redirects to /admin', async () => {
        (global.fetch as any)
            .mockResolvedValueOnce(jsonResponse(200, { done: false, challengeName: 'EMAIL_OTP', session: 'sess-123' }))
            .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

        render(<LoginPage />);

        await submitPassword();
        expect(await screen.findByLabelText(/^Verification code/i)).toBeInTheDocument();

        await userEvent.type(screen.getByLabelText(/^Verification code/i), '123456');
        await userEvent.click(screen.getByRole('button', { name: /verify/i }));

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin'));
    });

    // Regression coverage for the PASSWORD_RESET_REQUIRED bug: this challenge has no
    // session, and the whole point is that the page still transitions correctly.
    it('goes through password -> PASSWORD_RESET_REQUIRED -> reset -> shows success alert on the sign-in step', async () => {
        (global.fetch as any)
            .mockResolvedValueOnce(jsonResponse(200, { done: false, challengeName: 'PASSWORD_RESET_REQUIRED', session: undefined }))
            .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

        render(<LoginPage />);

        await submitPassword();
        expect(await screen.findByLabelText(/^Reset code/i)).toBeInTheDocument();

        await userEvent.type(screen.getByLabelText(/^Reset code/i), '1234567');
        await userEvent.type(screen.getByLabelText(/^New password/i), 'NewStrongPass1!');
        await userEvent.type(screen.getByLabelText(/^Confirm new password/i), 'NewStrongPass1!');
        await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

        await screen.findByRole('alert');
        expect(screen.getByLabelText(/^Username/i)).toBeInTheDocument();
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('goes through password -> NEW_PASSWORD_REQUIRED -> EMAIL_OTP -> verified and redirects to /admin', async () => {
        (global.fetch as any)
            .mockResolvedValueOnce(jsonResponse(200, { done: false, challengeName: 'NEW_PASSWORD_REQUIRED', session: 'sess-123' }))
            .mockResolvedValueOnce(jsonResponse(200, { done: false, challengeName: 'EMAIL_OTP', session: 'sess-456' }))
            .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

        render(<LoginPage />);

        await submitPassword();
        expect(await screen.findByLabelText(/^New password/i)).toBeInTheDocument();

        await userEvent.type(screen.getByLabelText(/^New password/i), 'NewStrongPass1!');
        await userEvent.type(screen.getByLabelText(/^Confirm new password/i), 'NewStrongPass1!');
        await userEvent.click(screen.getByRole('button', { name: /continue/i }));

        expect(await screen.findByLabelText(/^Verification code/i)).toBeInTheDocument();

        await userEvent.type(screen.getByLabelText(/^Verification code/i), '123456');
        await userEvent.click(screen.getByRole('button', { name: /verify/i }));

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin'));
    });

    it('returns to the password step when "Back to sign in" is clicked from the OTP step', async () => {
        (global.fetch as any).mockResolvedValueOnce(jsonResponse(200, { done: false, challengeName: 'EMAIL_OTP', session: 'sess-123' }));

        render(<LoginPage />);

        await submitPassword();
        expect(await screen.findByLabelText(/^Verification code/i)).toBeInTheDocument();

        await userEvent.click(screen.getByText('Back to sign in'));

        expect(screen.getByLabelText(/^Username/i)).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
