import { NextRequest, NextResponse } from 'next/server';
import { getDynamoDbClient } from '@/storage/dynamodb';
import { AnalyticsEventStorage, ShareMethod, CtaAction, LinkTarget } from '@/storage/AnalyticsEventStorage';
import { getClientIp } from '@/util/request';
import { hashValue } from '@/util/hash';
import { parseUserAgent } from '@/util/userAgent';
import { TrackEventType } from '@/util/trackEvent';

interface TrackRequest {
    eventType: TrackEventType;
    payload: Record<string, string>;
}

const ALLOWED_EVENT_TYPES: TrackEventType[] = ['share', 'cta', 'externalLink'];

const analyticsStorage = new AnalyticsEventStorage(getDynamoDbClient());

export async function POST(request: NextRequest) {
    let body: TrackRequest;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body.eventType || !ALLOWED_EVENT_TYPES.includes(body.eventType)) {
        return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 });
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const timestamp = now.toISOString();
    const ua = request.headers.get('user-agent') ?? '';
    const baseEvent = {
        date,
        timestamp,
        hashedIp: hashValue(getClientIp(request)),
        ...parseUserAgent(ua),
    };

    const { eventType, payload } = body;

    if (eventType === 'share') {
        void analyticsStorage.writeShareEvent({
            ...baseEvent,
            shareMethod: payload.shareMethod as ShareMethod,
            songKey: payload.songKey ?? '',
            songName: payload.songName,
            artistName: payload.artistName,
        });
    } else if (eventType === 'cta') {
        void analyticsStorage.writeCtaEvent({
            ...baseEvent,
            ctaAction: payload.ctaAction as CtaAction,
            ctaType: 'kofi',
        });
    } else if (eventType === 'externalLink') {
        void analyticsStorage.writeLinkEvent({
            ...baseEvent,
            linkTarget: payload.linkTarget as LinkTarget,
            linkContext: payload.linkContext ?? '',
        });
    }

    return new NextResponse(null, { status: 204 });
}
