import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LyricsModal } from '@/components/LyricsModal';

beforeEach(() => {
    localStorage.clear();
});

describe('LyricsModal', () => {
    it('shows the lyrics directly when the song is not mature', () => {
        render(
            <LyricsModal
                open
                onClose={() => {}}
                title="Terrified"
                artist="Guster"
                lyrics="some lyrics here"
                isMature={false}
            />,
        );

        expect(screen.getByText('some lyrics here')).toBeInTheDocument();
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('gates the lyrics behind the mature content warning, keeping them out of the DOM, when the song is mature', async () => {
        render(
            <LyricsModal
                open
                onClose={() => {}}
                title="Terrified"
                artist="Guster"
                lyrics="some lyrics here"
                isMature={true}
            />,
        );

        await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument());
        expect(screen.queryByText('some lyrics here')).not.toBeInTheDocument();
    });

    it('reveals the lyrics after consent is confirmed', async () => {
        render(
            <LyricsModal
                open
                onClose={() => {}}
                title="Terrified"
                artist="Guster"
                lyrics="some lyrics here"
                isMature={true}
            />,
        );

        await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument());
        await userEvent.click(screen.getByRole('button', { name: /i am at least 18 years old/i }));

        expect(screen.getByText('some lyrics here')).toBeInTheDocument();
    });

    it('shows a fallback message when there are no lyrics', () => {
        render(
            <LyricsModal
                open
                onClose={() => {}}
                title="Terrified"
                artist="Guster"
                lyrics={undefined}
                isMature={false}
            />,
        );

        expect(screen.getByText('No lyrics to show :(')).toBeInTheDocument();
    });

    it('renders the song title and artist in the header', () => {
        render(
            <LyricsModal
                open
                onClose={() => {}}
                title="Terrified"
                artist="Guster"
                lyrics="some lyrics here"
                isMature={false}
            />,
        );

        expect(screen.getByRole('heading', { name: /terrified by guster/i })).toBeInTheDocument();
    });
});
