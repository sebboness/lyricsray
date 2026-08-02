import { NextResponse } from 'next/server';
import { logger } from '@/logger/logger';
import { apiGetPublic } from '@/lib/api';

export async function GET() {
    try {
        const { data } = await apiGetPublic('/v1/altcha/challenge');
        return NextResponse.json(data);
    } catch (error) {
        logger.error('Error creating ALTCHA challenge:', error);
        return NextResponse.json(
            { error: 'Failed to create challenge' },
            { status: 500 }
        );
    }
}
