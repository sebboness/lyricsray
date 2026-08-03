import { logger } from '@/logger/logger';
import { ApiRequestError, apiPostPublic } from '@/lib/api';
import { setSession, setRefreshCookie } from '@/lib/session';
import { decodeIdToken } from '@/lib/jwt';
import { NextRequest, NextResponse } from 'next/server';

interface VerifyRequest {
    username: string;
    session: string;
    code: string;
}

interface VerifyResponse {
    tokens: { idToken: string; accessToken: string; refreshToken: string; expiresIn: number };
}

export async function POST(request: NextRequest) {
    try {
        const body: VerifyRequest = await request.json();

        const { data } = await apiPostPublic<VerifyResponse>('/v1/admin/auth/verify', body);

        await setSession(data.tokens.idToken, data.tokens.expiresIn);

        // Use the canonical username from the verified token's claims (not the raw
        // login input) so the refresh flow's SECRET_HASH always matches what Cognito
        // expects.
        const claims = decodeIdToken(data.tokens.idToken);
        if (claims?.['cognito:username'] && data.tokens.refreshToken) {
            await setRefreshCookie(claims['cognito:username'], data.tokens.refreshToken);
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof ApiRequestError) {
            return NextResponse.json(
                { error: error.errors[0] ?? error.message },
                { status: error.statusCode }
            );
        }

        logger.error('Error in admin verify endpoint:', error);
        return NextResponse.json(
            { error: 'Verification failed. Please try again.' },
            { status: 500 }
        );
    }
}
