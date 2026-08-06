import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupportPromptBanner } from '@/components/SupportPromptBanner';

// The banner reveals itself 3s after mounting (via MUI Collapse), and elements inside a
// collapsed/hidden Collapse are treated as inaccessible by role queries, so tests need to
// wait past that delay before querying by role.
const REVEAL_WAIT_OPTIONS = { timeout: 4000 };

describe('SupportPromptBanner', () => {
    it('renders the message and a Ko-fi link', async () => {
        render(<SupportPromptBanner onDismiss={() => {}} />);

        expect(screen.getByText(/We hope this analysis helped you/i)).toBeInTheDocument();

        const kofiLink = await waitFor(
            () => screen.getByRole('link', { name: /Support on Ko-fi/i }),
            REVEAL_WAIT_OPTIONS
        );
        expect(kofiLink).toHaveAttribute('href', expect.stringContaining('ko-fi.com'));
        expect(kofiLink).toHaveAttribute('target', '_blank');
    }, 6000);

    it('calls onDismiss when the dismiss button is clicked', async () => {
        const onDismiss = vi.fn();
        render(<SupportPromptBanner onDismiss={onDismiss} />);

        const dismissButton = await waitFor(
            () => screen.getByRole('button', { name: /dismiss/i }),
            REVEAL_WAIT_OPTIONS
        );
        await userEvent.click(dismissButton);

        expect(onDismiss).toHaveBeenCalledTimes(1);
    }, 6000);

    it('schedules its reveal 3 seconds after mounting', () => {
        const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

        render(<SupportPromptBanner onDismiss={() => {}} />);

        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3000);
        setTimeoutSpy.mockRestore();
    });
});
