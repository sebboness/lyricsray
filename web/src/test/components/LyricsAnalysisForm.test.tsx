import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LyricsAnalysisForm } from '@/components/LyricsAnalysisForm';

vi.mock('@/util/altchaClient', () => ({
    getCachedAltcha: () => 'cached-altcha-payload',
    setCachedAltcha: vi.fn(),
    clearCachedAltcha: vi.fn(),
}));

function jsonResponse(status: number, body: unknown) {
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const successResult = {
    appropriate: 1,
    analysis: 'Some analysis text',
    recommendedAge: 8,
    songKey: 'unknown/abc123',
    themes: ['fun'],
};

async function submitLyrics() {
    render(<LyricsAnalysisForm />);
    await userEvent.click(await screen.findByRole('tab', { name: /paste lyrics/i }));
    await userEvent.type(await screen.findByLabelText(/song lyrics/i), 'la la la lyrics');
    await userEvent.click(screen.getByRole('button', { name: /analyze lyrics/i }));
}

beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_PROMPT_FIRST_THRESHOLD', '2');
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_PROMPT_COOLDOWN', '10');
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue(jsonResponse(200, successResult));
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('LyricsAnalysisForm support prompt', () => {
    it('does not show the banner and shows the bottom Ko-fi CTA below the threshold', async () => {
        await submitLyrics();

        await waitFor(() => expect(screen.getByText(/Did this analysis help you\?/i)).toBeInTheDocument());
        expect(screen.queryByText(/We hope this analysis helped you/i)).not.toBeInTheDocument();
        expect(localStorage.getItem('lyricsray_analysis_count')).toBe('1');
    });

    it('shows the banner and hides the bottom Ko-fi CTA at/above the threshold', async () => {
        localStorage.setItem('lyricsray_analysis_count', '1'); // this submission will be the 2nd, matching the stubbed threshold of 2

        await submitLyrics();

        await waitFor(() => expect(screen.getByText(/We hope this analysis helped you/i)).toBeInTheDocument());
        expect(screen.queryByText(/Did this analysis help you\?/i)).not.toBeInTheDocument();
    });

    it('hides the banner and restores the bottom CTA once dismissed', async () => {
        localStorage.setItem('lyricsray_analysis_count', '1');

        await submitLyrics();

        await waitFor(() => expect(screen.getByText(/We hope this analysis helped you/i)).toBeInTheDocument());

        // The banner reveals itself 3s after mounting (via MUI Collapse); until then it's
        // treated as inaccessible by role queries, so wait past that delay before clicking.
        const dismissButton = await waitFor(
            () => screen.getByRole('button', { name: /dismiss/i }),
            { timeout: 4000 }
        );
        await userEvent.click(dismissButton);

        expect(screen.queryByText(/We hope this analysis helped you/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Did this analysis help you\?/i)).toBeInTheDocument();
        expect(localStorage.getItem('lyricsray_support_prompt_next_at')).toBe('12');
    }, 10000);
});
