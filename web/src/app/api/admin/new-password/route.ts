import { logger } from '@/logger/logger';
import { ApiRequestError, apiPostPublic } from '@/lib/api';
import { finalizeLoginResult, RawLoginResult } from '@/lib/adminAuthResponse';
import { NextRequest, NextResponse } from 'next/server';

interface NewPasswordRequest {
    username: string;
    session: string;
    newPassword: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: NewPasswordRequest = await request.json();

        const { data } = await apiPostPublic<RawLoginResult>('/v1/admin/auth/new-password', body);

        return NextResponse.json(await finalizeLoginResult(data));
    } catch (error) {
        if (error instanceof ApiRequestError) {
            return NextResponse.json(
                { error: error.errors[0] ?? error.message },
                { status: error.statusCode }
            );
        }

        logger.error('Error in admin new-password endpoint:', error);
        return NextResponse.json(
            { error: 'Could not set new password. Please try again.' },
            { status: 500 }
        );
    }
}
