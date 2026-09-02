import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeBreakdown } from '@/components/ThemeBreakdown';

describe('ThemeBreakdown', () => {
    it('renders nothing when there are no themes', () => {
        const { container } = render(<ThemeBreakdown themes={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('scales bars relative to the highest theme percentage, so the top theme is a full bar', () => {
        render(
            <ThemeBreakdown
                themes={['violence', 'drugs']}
                themePercentages={[
                    { theme: 'violence', percentage: 70 },
                    { theme: 'drugs', percentage: 20 },
                ]}
            />
        );

        const bars = screen.getAllByRole('progressbar');
        expect(bars).toHaveLength(2);
        expect(bars[0]).toHaveAttribute('aria-valuenow', '100');
        expect(bars[1]).toHaveAttribute('aria-valuenow', String(Math.round((20 / 70) * 100)));
        expect(bars[0]).toHaveAttribute('aria-label', 'violence: 70%');
        expect(bars[1]).toHaveAttribute('aria-label', 'drugs: 20%');
        expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it('renders plain chips with no percentage when themePercentages is entirely absent', () => {
        render(<ThemeBreakdown themes={['violence', 'romance']} />);

        expect(screen.getByText('violence')).toBeInTheDocument();
        expect(screen.getByText('romance')).toBeInTheDocument();
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('falls back to a plain chip per-theme when only some themes have a matching percentage', () => {
        render(
            <ThemeBreakdown
                themes={['violence', 'romance']}
                themePercentages={[{ theme: 'violence', percentage: 70 }]}
            />
        );

        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
        expect(screen.getByText('romance')).toBeInTheDocument();
    });

    it('renders an empty bar rather than dividing by zero when every percentage is 0', () => {
        render(
            <ThemeBreakdown
                themes={['violence']}
                themePercentages={[{ theme: 'violence', percentage: 0 }]}
            />
        );

        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    it('matches themes to percentages case-insensitively', () => {
        render(
            <ThemeBreakdown
                themes={['Violence']}
                themePercentages={[{ theme: 'VIOLENCE', percentage: 55 }]}
            />
        );

        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
        expect(screen.queryByText('Violence', { selector: '.MuiChip-label' })).not.toBeInTheDocument();
    });
});
