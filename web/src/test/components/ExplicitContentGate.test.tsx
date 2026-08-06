import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExplicitContentGate } from '@/components/ExplicitContentGate';

beforeEach(() => {
    localStorage.clear();
});

describe('ExplicitContentGate', () => {
    it('shows the warning overlay, and never renders the real content, when consent has not been given', async () => {
        render(
            <ExplicitContentGate>
                {() => <div>secret lyrics</div>}
            </ExplicitContentGate>,
        );

        await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument());
        expect(screen.getByRole('button', { name: /i am at least 18 years old/i })).toBeInTheDocument();
        expect(screen.queryByText('secret lyrics')).not.toBeInTheDocument();
    });

    it('hides the overlay, reveals the real content, and persists consent once the button is clicked', async () => {
        render(
            <ExplicitContentGate>
                {() => <div>secret lyrics</div>}
            </ExplicitContentGate>,
        );

        await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument());
        await userEvent.click(screen.getByRole('button', { name: /i am at least 18 years old/i }));

        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(screen.getByText('secret lyrics')).toBeInTheDocument();
        expect(localStorage.getItem('lyricsray_explicit_consent')).toBe('true');
    });

    it('does not show the overlay, and renders the real content, when consent was already given previously', async () => {
        localStorage.setItem('lyricsray_explicit_consent', 'true');

        render(
            <ExplicitContentGate>
                {() => <div>secret lyrics</div>}
            </ExplicitContentGate>,
        );

        await waitFor(() => expect(screen.getByText('secret lyrics')).toBeInTheDocument());
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
});
