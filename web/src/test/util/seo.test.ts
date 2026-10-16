import { describe, it, expect } from 'vitest';
import { buildMetadata, DEFAULT_OG_IMAGE } from '@/util/seo';

const args = { title: 'T', description: 'D', path: '/about' };

describe('buildMetadata', () => {
    it('falls back to the default logo image when no image is given', () => {
        const metadata = buildMetadata(args);

        expect(metadata.openGraph.images).toEqual([DEFAULT_OG_IMAGE]);
        expect(metadata.twitter.images).toEqual([DEFAULT_OG_IMAGE.url]);
    });

    it('uses a custom image when provided', () => {
        const image = { url: 'https://x/y.png', width: 1, height: 1, alt: 'a' };
        const metadata = buildMetadata({ ...args, image });

        expect(metadata.openGraph.images).toEqual([image]);
        expect(metadata.twitter.images).toEqual([image.url]);
    });

    it('omits images entirely when null so an opengraph-image route can supply them', () => {
        const metadata = buildMetadata({ ...args, image: null });

        expect(metadata.openGraph).not.toHaveProperty('images');
        expect(metadata.twitter).not.toHaveProperty('images');
    });

    it('sets only twitter:image when a twitterImageUrl is given alongside a null image', () => {
        const metadata = buildMetadata({ ...args, image: null, twitterImageUrl: 'https://x/a/opengraph-image' });

        expect(metadata.openGraph).not.toHaveProperty('images');
        expect(metadata.twitter.images).toEqual(['https://x/a/opengraph-image']);
    });

    it('lets twitterImageUrl override the og image url for twitter only', () => {
        const image = { url: 'https://x/y.png', width: 1, height: 1, alt: 'a' };
        const metadata = buildMetadata({ ...args, image, twitterImageUrl: 'https://x/t.png' });

        expect(metadata.openGraph.images).toEqual([image]);
        expect(metadata.twitter.images).toEqual(['https://x/t.png']);
    });
});
