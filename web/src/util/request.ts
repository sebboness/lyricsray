import { NextRequest } from "next/server";

interface HeadersLike {
    get(name: string): string | null;
}

/** Extracts ua and ip from Next.js server headers() or any compatible headers object. */
export function getRequestContext(requestHeaders: HeadersLike): { ua: string; ip: string } {
    const ua = requestHeaders.get('user-agent') ?? '';
    const ip = requestHeaders.get('cf-connecting-ip')
        ?? requestHeaders.get('x-real-ip')
        ?? requestHeaders.get('x-forwarded-for')?.split(',')[0].trim()
        ?? '';
    return { ua, ip };
}

export const getClientIp = (request: NextRequest & { ip?: string }): string => {
    // Check various headers that might contain the real IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cloudflareIp = request.headers.get('cf-connecting-ip');
    
    if (cloudflareIp) return cloudflareIp;
    if (realIp) return realIp;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    // Fallback to a default if we can't determine IP
    return request.ip || 'unknown';
}