import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtistOgCard } from '@/og/ArtistOgCard';

const baseProps = {
    logoSrc: 'data:image/png;base64,AAAA',
    artistName: 'Sabrina Carpenter',
    songCount: 15,
    summary: '1 of 15 analyzed songs are safe for all ages; the rest are worth a listen first.',
    ageBuckets: [
        { label: 'ALL', count: 1, color: '#46d6c4' },
        { label: '16+', count: 10, color: '#f2b74a' },
    ],
};

const spreadSegments = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLElement>('div')).filter((el) => el.style.height === '16px');

describe('ArtistOgCard', () => {
    it('shows the artist, song count, summary and a legend entry per age bucket', () => {
        render(<ArtistOgCard {...baseProps} />);

        expect(screen.getByText('Sabrina Carpenter')).toBeInTheDocument();
        expect(screen.getByText('15 songs analyzed')).toBeInTheDocument();
        expect(screen.getByText(baseProps.summary)).toBeInTheDocument();
        expect(screen.getByText('All ages · 1')).toBeInTheDocument();
        expect(screen.getByText('16+ · 10')).toBeInTheDocument();
    });

    it('uses the singular for a single song', () => {
        render(<ArtistOgCard {...baseProps} songCount={1} />);

        expect(screen.getByText('1 song analyzed')).toBeInTheDocument();
    });

    it('sizes each spread segment by its bucket count', () => {
        const { container } = render(<ArtistOgCard {...baseProps} />);

        expect(spreadSegments(container).map((s) => s.style.flexGrow || s.style.flex)).toEqual(expect.arrayContaining(['1', '10']));
    });

    it('draws a single full-width segment when there is only one bucket', () => {
        const { container } = render(<ArtistOgCard {...baseProps} songCount={3} ageBuckets={[{ label: '13+', count: 3, color: '#f2b74a' }]} />);

        expect(spreadSegments(container)).toHaveLength(1);
        expect(screen.getByText('13+ · 3')).toBeInTheDocument();
    });

    it('draws a segment and legend entry for every bucket when there are many', () => {
        const ageBuckets = ['ALL', '7+', '10+', '13+', '16+', '18+'].map((label, i) => ({ label, count: i + 1, color: '#fff' }));
        const { container } = render(<ArtistOgCard {...baseProps} songCount={21} ageBuckets={ageBuckets} />);

        expect(spreadSegments(container)).toHaveLength(6);
        expect(screen.getByText('All ages · 1')).toBeInTheDocument();
        expect(screen.getByText('18+ · 6')).toBeInTheDocument();
    });

    it('truncates a very long summary', () => {
        render(<ArtistOgCard {...baseProps} summary={'word '.repeat(100)} />);

        const summary = screen.getByText(/^word/);
        expect(summary.textContent!.length).toBeLessThanOrEqual(140);
        expect(summary.textContent!.endsWith('…')).toBe(true);
    });

    it('falls back to a placeholder name when the artist name is empty', () => {
        render(<ArtistOgCard {...baseProps} artistName="" />);

        expect(screen.getByText('Unknown artist')).toBeInTheDocument();
    });
});
