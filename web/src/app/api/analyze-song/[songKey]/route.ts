import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/logger/logger';
import { ApiRequestError, apiGetPublic } from '@/lib/api';
import { AnalysisResult } from '@/storage/AnalysisResultStorage';

interface RouteContext {
    params: Promise<{
        songKey: string;
    }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { songKey } = await context.params;

        if (!songKey) {
            return NextResponse.json(
                { error: 'songKey parameter is required' },
                { status: 400 }
            );
        }

        const { data } = await apiGetPublic<{ result: AnalysisResult }>(`/v1/analyze-song/${encodeURIComponent(songKey)}`);

        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof ApiRequestError) {
            return NextResponse.json(
                { error: error.errors[0] ?? error.message },
                { status: error.statusCode }
            );
        }

        logger.error('Error retrieving analysis result:', error);
        return NextResponse.json(
            { error: 'Internal server error. Please try again.' },
            { status: 500 }
        );
    }
}
