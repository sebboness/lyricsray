import { logger } from '@/logger/logger';
import { ApiRequestError, apiPostPublic } from '@/lib/api';
import { completeLogin } from '@/lib/session';
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

        await completeLogin(data.tokens);

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
