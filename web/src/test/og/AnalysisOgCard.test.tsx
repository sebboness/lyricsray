import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalysisOgCard, type AnalysisOgCardProps } from '@/og/AnalysisOgCard';

const baseProps: AnalysisOgCardProps = {
    logoSrc: 'data:image/png;base64,AAAA',
    songName: 'Wild One',
    artistName: 'Ke$ha',
    appropriate: 3,
    recommendedAge: 18,
    summary: 'Heavy innuendo',
    themes: ['sexual_innuendo', 'party_culture'],
    themePercentages: [
        { theme: 'sexual_innuendo', percentage: 60 },
        { theme: 'party_culture', percentage: 30 },
    ],
};

const renderCard = (overrides: Partial<AnalysisOgCardProps> = {}) => render(<AnalysisOgCard {...baseProps} {...overrides} />);

describe('AnalysisOgCard', () => {
    it('shows the song, artist, short age and verdict label for the appropriateness level', () => {
        renderCard();

        expect(screen.getByText('Wild One')).toBeInTheDocument();
        expect(screen.getByText('Ke$ha')).toBeInTheDocument();
        expect(screen.getByText('18+')).toBeInTheDocument();
        expect(screen.getByText('Not for kids')).toBeInTheDocument();
    });

    it('shows All ages as "ALL"', () => {
        renderCard({ appropriate: 1, recommendedAge: 'All' });

        expect(screen.getByText('ALL')).toBeInTheDocument();
        expect(screen.getByText('Safe')).toBeInTheDocument();
    });

    it('hides the artist when it is missing or "Unknown"', () => {
        const { rerender } = renderCard({ artistName: 'Unknown' });
        expect(screen.queryByText('Unknown')).not.toBeInTheDocument();

        rerender(<AnalysisOgCard {...baseProps} artistName={undefined} />);
        expect(screen.queryByText('Ke$ha')).not.toBeInTheDocument();
    });

    it('falls back to a placeholder title when the song name is empty', () => {
        renderCard({ songName: '' });

        expect(screen.getByText('Unknown song')).toBeInTheDocument();
    });

    it('truncates a very long summary', () => {
        renderCard({ summary: 'word '.repeat(100) });

        const summary = screen.getByText(/^word/);
        expect(summary.textContent!.length).toBeLessThanOrEqual(110);
        expect(summary.textContent!.endsWith('…')).toBe(true);
    });

    it('omits the summary when none is provided', () => {
        renderCard({ summary: undefined });

        expect(screen.queryByText('Heavy innuendo')).not.toBeInTheDocument();
    });

    it('caps the themes shown at six', () => {
        const themes = Array.from({ length: 9 }, (_, i) => `theme_${i}`);
        renderCard({ themes, themePercentages: themes.map((theme, i) => ({ theme, percentage: 90 - i })) });

        expect(screen.getAllByText(/^Theme \d$/i)).toHaveLength(6);
    });

    it('shows plain chips when no percentages exist, and no Themes section when there are no themes', () => {
        const { rerender } = renderCard({ themePercentages: undefined });
        expect(screen.getByText('sexual innuendo')).toBeInTheDocument();

        rerender(<AnalysisOgCard {...baseProps} themes={[]} themePercentages={undefined} />);
        expect(screen.queryByText('Themes')).not.toBeInTheDocument();
    });

    it('sizes theme bars relative to the top theme and keeps a visible sliver for tiny or zero values', () => {
        const { container } = renderCard({
            themes: ['a', 'b', 'c'],
            themePercentages: [
                { theme: 'a', percentage: 100 },
                { theme: 'b', percentage: 50 },
                { theme: 'c', percentage: 0 },
            ],
        });

        const widths = Array.from(container.querySelectorAll<HTMLElement>('div'))
            .filter((el) => el.style.height === '8px' && el.style.width.endsWith('%'))
            .map((el) => el.style.width);
        expect(widths).toEqual(['100%', '50%', '3%']);
    });

    it('renders a plain chip for a theme that has no percentage next to bars for the rest', () => {
        renderCard({ themes: ['sexual_innuendo', 'romance'], themePercentages: [{ theme: 'sexual_innuendo', percentage: 60 }] });

        expect(screen.getByText('sexual innuendo')).toBeInTheDocument();
        expect(screen.getByText('romance')).toBeInTheDocument();
    });

    it('keeps the card intact for a multi-byte song title', () => {
        renderCard({ songName: 'Señorita 🎵', artistName: 'Beyoncé' });

        expect(screen.getByText('Señorita 🎵')).toBeInTheDocument();
        expect(screen.getByText('Beyoncé')).toBeInTheDocument();
    });

    it('renders a neutral card for an unrecognised verdict instead of throwing', () => {
        renderCard({ appropriate: 0 });

        expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
});
