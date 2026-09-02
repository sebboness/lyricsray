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

    it('shows the recommended age derived from the numeric prop', () => {
        render(<AppropriatenessCard appropriate={1} recommendedAge={16} />);

        expect(screen.getByText(/Age 16\+/)).toBeInTheDocument();
    });

    it('shows "All ages" when recommendedAge is the "All" sentinel', () => {
        render(<AppropriatenessCard appropriate={1} recommendedAge={'All' as unknown as number} />);

        expect(screen.getByText(/All ages/)).toBeInTheDocument();
    });

    it('shows the share button only when showShareButton is true and a songKey is provided', () => {
        render(<AppropriatenessCard appropriate={1} recommendedAge={13} showShareButton songKey="Artist/Song/abc123" />);

        expect(screen.getByLabelText('share')).toBeInTheDocument();
    });

    it('hides the share button when showShareButton is true but songKey is missing', () => {
        render(<AppropriatenessCard appropriate={1} recommendedAge={13} showShareButton />);

        expect(screen.queryByLabelText('share')).not.toBeInTheDocument();
    });

    it('hides the share button when showShareButton is false even with a songKey', () => {
        render(<AppropriatenessCard appropriate={1} recommendedAge={13} songKey="Artist/Song/abc123" />);

        expect(screen.queryByLabelText('share')).not.toBeInTheDocument();
    });
});
