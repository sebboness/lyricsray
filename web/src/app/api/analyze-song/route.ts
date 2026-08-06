import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/logger/logger';
import { ApiRequestError, apiPostPublic, forwardHeaders } from '@/lib/api';
import { getDynamoDbClient } from '@/storage/dynamodb';
import { AnalyticsEventStorage } from '@/storage/AnalyticsEventStorage';
import { getClientIp } from '@/util/request';
import { hashValue } from '@/util/hash';
import { parseUserAgent } from '@/util/userAgent';

interface AnalyzeSongRequest {
    altchaPayload: string;
    lyrics: string;
    albumName?: string;
    songName?: string;
    artistName?: string;
}

interface AnalyzeSongResponse {
    appropriate: number;
    analysis: string;
    recommendedAge: string;
    songKey: string;
    themes: string[];
    cacheHit?: boolean;
    error?: string;
}

const RATE_LIMIT_HEADERS = ['X-RateLimit-Remaining-Hourly', 'X-RateLimit-Remaining-Daily'];

const analyticsStorage = new AnalyticsEventStorage(getDynamoDbClient());

export async function POST(request: NextRequest) {
    try {
        const body: AnalyzeSongRequest = await request.json();

        const { data, headers } = await apiPostPublic<AnalyzeSongResponse>('/v1/analyze-song', body);

        const now = new Date();
        const ua = request.headers.get('user-agent') ?? '';
        void analyticsStorage.writeAnalysisEvent({
            date: now.toISOString().split('T')[0],
            timestamp: now.toISOString(),
            hashedIp: hashValue(getClientIp(request)),
            ...parseUserAgent(ua),
            songKey: data.songKey,
            artistName: body.artistName ?? '',
            songName: body.songName ?? '',
            cacheHit: data.cacheHit ?? false,
        });

        return NextResponse.json(data, {
            headers: forwardHeaders(headers, RATE_LIMIT_HEADERS),
        });
    } catch (error) {
        if (error instanceof ApiRequestError) {
            if (error.statusCode === 429) {
                return NextResponse.json(
                    {
                        error: error.errors[0] ?? 'Rate limit exceeded',
                        retryAfter: error.headers.get('Retry-After') ? parseInt(error.headers.get('Retry-After')!, 10) : undefined,
                    },
                    {
                        status: 429,
                        headers: forwardHeaders(error.headers, ['Retry-After', ...RATE_LIMIT_HEADERS]),
                    }
                );
            }

            return NextResponse.json(
                { error: error.errors[0] ?? error.message },
                { status: error.statusCode }
            );
        }

        logger.error('Error analyzing song:', error);
        return NextResponse.json(
            {
                error: 'Internal server error. Please try again.',
                appropriate: false,
                analysis: '',
                recommendedAge: ''
            },
            { status: 500 }
        );
    }
}
