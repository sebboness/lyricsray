import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppropriatenessCard } from '@/components/AppropriatenessCard';

describe('AppropriatenessCard', () => {
    it('renders the summary line when one is provided', () => {
        render(<AppropriatenessCard appropriate={2} recommendedAge={16} summary="Explicit language, disturbing themes" />);

        expect(screen.getByText('Explicit language, disturbing themes')).toBeInTheDocument();
    });

    it('renders one fewer paragraph when summary is omitted, vs. when one is provided', () => {
        const { container: withSummary } = render(<AppropriatenessCard appropriate={1} recommendedAge={13} summary="test summary" />);
        const { container: withoutSummary } = render(<AppropriatenessCard appropriate={1} recommendedAge={13} />);

        expect(withSummary.querySelectorAll('p').length).toBe(withoutSummary.querySelectorAll('p').length + 1);
    });

    it('renders no summary paragraph when summary is an empty string (same as omitted)', () => {
        const { container: emptySummary } = render(<AppropriatenessCard appropriate={1} recommendedAge={13} summary="" />);
        const { container: noSummary } = render(<AppropriatenessCard appropriate={1} recommendedAge={13} />);

        expect(emptySummary.querySelectorAll('p').length).toBe(noSummary.querySelectorAll('p').length);
    });

    it('shows the short recommended age derived from the numeric prop', () => {
        render(<AppropriatenessCard appropriate={1} recommendedAge={16} />);

        expect(screen.getByText('16+')).toBeInTheDocument();
    });

    it('shows "ALL" when recommendedAge is the "All" sentinel', () => {
        render(<AppropriatenessCard appropriate={1} recommendedAge={'All' as unknown as number} />);

        expect(screen.getByText('ALL')).toBeInTheDocument();
    });

    it('shows the mockup verdict label for each appropriateness level', () => {
        const { rerender } = render(<AppropriatenessCard appropriate={1} recommendedAge={7} />);
        expect(screen.getByText('Safe')).toBeInTheDocument();

        rerender(<AppropriatenessCard appropriate={2} recommendedAge={13} />);
        expect(screen.getByText('Listen first')).toBeInTheDocument();

        rerender(<AppropriatenessCard appropriate={3} recommendedAge={18} />);
        expect(screen.getByText('Not for kids')).toBeInTheDocument();
    });
});
