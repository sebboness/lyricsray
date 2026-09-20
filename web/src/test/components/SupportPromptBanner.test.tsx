import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupportPromptBanner } from '@/components/SupportPromptBanner';

vi.mock('@/util/trackEvent', () => ({ trackEvent: vi.fn() }));

const defaultProps = { onDismiss: vi.fn(), showCount: 1, analysisCount: 3 };

describe('SupportPromptBanner', () => {
    it('renders the Ko-fi button immediately', () => {
        render(<SupportPromptBanner {...defaultProps} />);

        expect(screen.getByRole('button', { name: /Support on Ko-fi/i })).toBeInTheDocument();
    });

    it('renders the dismiss button', () => {
        render(<SupportPromptBanner {...defaultProps} />);

        expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('calls onDismiss when the dismiss button is clicked', async () => {
        const onDismiss = vi.fn();
        render(<SupportPromptBanner {...defaultProps} onDismiss={onDismiss} />);

        await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('shows first-appearance copy when showCount is 1', () => {
        render(<SupportPromptBanner {...defaultProps} showCount={1} />);

        expect(screen.getByText(/You just saved yourself from a bad song choice/i)).toBeInTheDocument();
    });

    it('shows second-appearance copy with analysis count when showCount is 2', () => {
        render(<SupportPromptBanner {...defaultProps} showCount={2} analysisCount={8} />);

        expect(screen.getByText(/You've checked 8 songs with LyricsRay/i)).toBeInTheDocument();
    });

    it('shows third-appearance copy when showCount is 3 or more', () => {
        render(<SupportPromptBanner {...defaultProps} showCount={3} />);

        expect(screen.getByText(/You're a LyricsRay regular now/i)).toBeInTheDocument();
    });
});
