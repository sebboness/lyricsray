import { logger } from '@/logger/logger';
import { ApiRequestError, apiPostPublic } from '@/lib/api';
import { NextRequest, NextResponse } from 'next/server';

interface ConfirmForgotPasswordRequest {
    username: string;
    confirmationCode: string;
    newPassword: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: ConfirmForgotPasswordRequest = await request.json();

        // No tokens come back from this call — it only clears Cognito's
        // RESET_REQUIRED status. The client signs in again with the new password.
        await apiPostPublic('/v1/admin/auth/confirm-forgot-password', body);

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof ApiRequestError) {
            return NextResponse.json(
                { error: error.errors[0] ?? error.message },
                { status: error.statusCode }
            );
        }

        logger.error('Error in admin confirm-forgot-password endpoint:', error);
        return NextResponse.json(
            { error: 'Could not reset password. Please try again.' },
            { status: 500 }
        );
    }
}
