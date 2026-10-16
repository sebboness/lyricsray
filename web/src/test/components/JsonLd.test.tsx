import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { JsonLd } from '@/components/JsonLd';

describe('JsonLd', () => {
    it('renders the data as a parseable application/ld+json script', () => {
        const { container } = render(<JsonLd data={{ '@type': 'CreativeWork', name: 'X' }} />);

        const script = container.querySelector('script[type="application/ld+json"]');
        expect(JSON.parse(script!.innerHTML)).toEqual({ '@type': 'CreativeWork', name: 'X' });
    });

    it('keeps markup in values from breaking out of the script', () => {
        const { container } = render(<JsonLd data={{ name: '</script><img src=x>' }} />);

        expect(container.querySelectorAll('script')).toHaveLength(1);
        expect(container.querySelector('img')).toBeNull();
        expect(JSON.parse(container.querySelector('script')!.innerHTML).name).toBe('</script><img src=x>');
    });
});
