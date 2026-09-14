import { getBaseUrl } from '@/util/routeHelper';

export const SITE_NAME = 'LyricsRay - Is this song safe for my child?';

export interface OgImage {
    url: string;
    width: number;
    height: number;
    alt: string;
}

/** The site's default social-share image — used on any page that doesn't have its own (e.g. a song thumbnail). */
export const DEFAULT_OG_IMAGE: OgImage = {
    url: `${getBaseUrl()}/images/logo-256.png`,
    width: 256,
    height: 256,
    alt: 'LyricsRay logo',
};

interface BuildMetadataArgs {
    title: string;
    description: string;
    /** Absolute or site-relative path, e.g. "/about" or a full URL. */
    path: string;
    /** Falls back to DEFAULT_OG_IMAGE when omitted. */
    image?: OgImage;
}

/**
 * Builds a consistent title/description/openGraph/twitter metadata object for a page.
 * Every page gets the site's logo as its social-share image unless it passes its own.
 */
export function buildMetadata({ title, description, path, image }: BuildMetadataArgs) {
    const ogImage = image ?? DEFAULT_OG_IMAGE;
    const url = path.startsWith('http') ? path : `${getBaseUrl()}${path}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url,
            siteName: SITE_NAME,
            type: 'website' as const,
            images: [ogImage],
        },
        twitter: {
            card: 'summary_large_image' as const,
            title,
            description,
            images: [ogImage.url],
        },
    };
}
