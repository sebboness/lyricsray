import { buildLlmsTxt } from '@/util/llmsTxt';
import { getBaseUrl } from '@/util/routeHelper';

export function GET() {
    return new Response(buildLlmsTxt(getBaseUrl()), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
