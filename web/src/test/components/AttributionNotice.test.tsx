import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttributionNotice } from '@/components/AttributionNotice';

describe('AttributionNotice', () => {
    it('links to the terms page', () => {
        render(<AttributionNotice />);
        expect(screen.getByRole('link')).toHaveAttribute('href', '/privacy-and-terms');
    });
});
