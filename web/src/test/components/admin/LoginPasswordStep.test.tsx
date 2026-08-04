import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPasswordStep } from '@/components/admin/LoginPasswordStep';

function jsonResponse(status: number, body: unknown) {
    return { ok: status >= 200 && status < 300, json: async () => body } as Response;
}

async function fillAndSubmit(username = 'admin', password = 'correct-password') {
    await userEvent.type(screen.getByLabelText(/^Username/i), username);
    await userEvent.type(screen.getByLabelText(/^Password/i), password);
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('LoginPasswordStep', () => {
    it('calls onLoggedIn when the response reports done', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { done: true }));
        const onChallenge = vi.fn();
        const onLoggedIn = vi.fn();
        render(<LoginPasswordStep onChallenge={onChallenge} onLoggedIn={onLoggedIn} />);

        await fillAndSubmit();

        await waitFor(() => expect(onLoggedIn).toHaveBeenCalledTimes(1));
        expect(onChallenge).not.toHaveBeenCalled();
    });

    it('calls onChallenge with the session for a normal EMAIL_OTP challenge', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { done: false, challengeName: 'EMAIL_OTP', session: 'sess-123' }));
        const onChallenge = vi.fn();
        render(<LoginPasswordStep onChallenge={onChallenge} onLoggedIn={vi.fn()} />);

        await fillAndSubmit('admin', 'correct-password');

        await waitFor(() => expect(onChallenge).toHaveBeenCalledWith({
            username: 'admin', session: 'sess-123', challengeName: 'EMAIL_OTP',
        }));
    });

    // Regression test: PASSWORD_RESET_REQUIRED legitimately has no session (it isn't
    // part of Cognito's RespondToAuthChallenge flow), unlike every other challenge.
    // A prior bug required `session` to be truthy for any non-done response, which
    // made this case fall through to the generic "unexpected response" error.
    it('calls onChallenge for PASSWORD_RESET_REQUIRED even though session is absent', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { done: false, challengeName: 'PASSWORD_RESET_REQUIRED', session: undefined }));
        const onChallenge = vi.fn();
        render(<LoginPasswordStep onChallenge={onChallenge} onLoggedIn={vi.fn()} />);

        await fillAndSubmit('admin', 'correct-password');

        await waitFor(() => expect(onChallenge).toHaveBeenCalledWith({
            username: 'admin', session: undefined, challengeName: 'PASSWORD_RESET_REQUIRED',
        }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows the server error message on invalid credentials', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(400, { error: 'Invalid username or password' }));
        render(<LoginPasswordStep onChallenge={vi.fn()} onLoggedIn={vi.fn()} />);

        await fillAndSubmit('admin', 'wrong-password');

        expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
    });

    it('enters an error state instead of advancing when a non-PASSWORD_RESET_REQUIRED challenge is missing a session', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { done: false, challengeName: 'EMAIL_OTP', session: undefined }));
        const onChallenge = vi.fn();
        const onLoggedIn = vi.fn();
        render(<LoginPasswordStep onChallenge={onChallenge} onLoggedIn={onLoggedIn} />);

        await fillAndSubmit();

        await screen.findByRole('alert');
        expect(onChallenge).not.toHaveBeenCalled();
        expect(onLoggedIn).not.toHaveBeenCalled();
    });

    it('enters an error state instead of advancing when challengeName is missing entirely', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { done: false }));
        const onChallenge = vi.fn();
        render(<LoginPasswordStep onChallenge={onChallenge} onLoggedIn={vi.fn()} />);

        await fillAndSubmit();

        await screen.findByRole('alert');
        expect(onChallenge).not.toHaveBeenCalled();
    });

    it('surfaces the underlying error message when the fetch call itself rejects', async () => {
        (global.fetch as any).mockRejectedValue(new Error('network down'));
        render(<LoginPasswordStep onChallenge={vi.fn()} onLoggedIn={vi.fn()} />);

        await fillAndSubmit();

        expect(await screen.findByText('network down')).toBeInTheDocument();
    });
});
