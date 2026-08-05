import { logger } from '@/logger/logger';
import { ApiRequestError, apiPostPublic } from '@/lib/api';
import { finalizeLoginResult, RawLoginResult } from '@/lib/adminAuthResponse';
import { NextRequest, NextResponse } from 'next/server';

interface LoginRequest {
    username: string;
    password: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: LoginRequest = await request.json();

        const { data } = await apiPostPublic<RawLoginResult>('/v1/admin/auth/login', body);

        return NextResponse.json(await finalizeLoginResult(data));
    } catch (error) {
        if (error instanceof ApiRequestError) {
            return NextResponse.json(
                { error: error.errors[0] ?? error.message },
                { status: error.statusCode }
            );
        }

        logger.error('Error in admin login endpoint:', error);
        return NextResponse.json(
            { error: 'Login failed. Please try again.' },
            { status: 500 }
        );
    }
}
