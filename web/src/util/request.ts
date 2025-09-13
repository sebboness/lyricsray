import { NextRequest } from "next/server";

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