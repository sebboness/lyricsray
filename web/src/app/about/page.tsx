import { AboutContent } from './AboutContent';
import { buildMetadata } from '@/util/seo';

const title = 'About LyricsRay | AI-Powered Lyrics Analysis for Parents';
const description =
    'LyricsRay uses AI to analyze song lyrics for explicit language, mature themes, and age-appropriate content, ' +
    'helping parents make informed decisions about the music their kids listen to.';

export const metadata = buildMetadata({ title, description, path: '/about' });

export default function AboutPage() {
    return <AboutContent />;
}
