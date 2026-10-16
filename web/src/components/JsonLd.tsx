import { serializeJsonLd } from '@/util/jsonLd';

interface JsonLdProps {
    data: object;
}

export function JsonLd({ data }: JsonLdProps) {
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
