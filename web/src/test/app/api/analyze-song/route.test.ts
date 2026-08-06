import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockApiPostPublic, mockWriteAnalysisEvent } = vi.hoisted(() => ({
    mockApiPostPublic: vi.fn(),
    mockWriteAnalysisEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/logger/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, apiPostPublic: mockApiPostPublic };
});

vi.mock('@/storage/dynamodb', () => ({ getDynamoDbClient: vi.fn(() => ({})) }));

vi.mock('@/storage/AnalyticsEventStorage', () => ({
    AnalyticsEventStorage: vi.fn().mockImplementation(() => ({
        writeAnalysisEvent: mockWriteAnalysisEvent,
    })),
}));

vi.mock('@/util/request', () => ({ getClientIp: vi.fn(() => '10.0.0.1') }));
vi.mock('@/util/hash', () => ({ hashValue: vi.fn(() => 'hashedip123456789012345') }));
vi.mock('@/util/userAgent', () => ({
    parseUserAgent: vi.fn(() => ({ uaType: 'person', browser: 'Chrome', os: 'Windows' })),
}));

import { POST } from '@/app/api/analyze-song/route';
import { ApiRequestError } from '@/lib/api';

function makeRequest(body: object, ua = 'Mozilla/5.0 Chrome'): NextRequest {
    return new NextRequest('http://localhost/api/analyze-song', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', 'user-agent': ua },
    });
}

const successData = {
    appropriate: 1,
    analysis: 'Clean song',
    recommendedAge: '5',
    songKey: 'Artist/Song/abc123',
    themes: [],
    cacheHit: false,
};

beforeEach(() => {
    vi.clearAllMocks();
    mockWriteAnalysisEvent.mockResolvedValue(undefined);
});

describe('POST /api/analyze-song (BFF proxy)', () => {
    it('proxies the request and returns Lambda data', async () => {
        mockApiPostPublic.mockResolvedValue({ data: successData, headers: new Headers() });

        const res = await POST(makeRequest({ altchaPayload: 'valid', lyrics: 'la la la', artistName: 'Artist', songName: 'Song' }));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.songKey).toBe('Artist/Song/abc123');
    });

    it('triggers a fire-and-forget analytics event after a successful response', async () => {
        mockApiPostPublic.mockResolvedValue({ data: successData, headers: new Headers() });

        await POST(makeRequest({ altchaPayload: 'valid', lyrics: 'la la la', artistName: 'Artist', songName: 'Song' }));

        // Give the void promise a tick to execute
        await new Promise((r) => setTimeout(r, 0));

        expect(mockWriteAnalysisEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                songKey: 'Artist/Song/abc123',
                cacheHit: false,
                uaType: 'person',
            }),
        );
    });

    it('forwards cacheHit: true when Lambda reports a cache hit', async () => {
        mockApiPostPublic.mockResolvedValue({ data: { ...successData, cacheHit: true }, headers: new Headers() });

        await POST(makeRequest({ altchaPayload: 'valid', lyrics: 'la la la' }));
        await new Promise((r) => setTimeout(r, 0));

        expect(mockWriteAnalysisEvent).toHaveBeenCalledWith(
            expect.objectContaining({ cacheHit: true }),
        );
    });

    it('returns 429 and forwards Retry-After when rate-limited', async () => {
        const rateLimitHeaders = new Headers({ 'Retry-After': '30', 'X-RateLimit-Remaining-Hourly': '0' });
        mockApiPostPublic.mockRejectedValue(new ApiRequestError(429, ['Rate limit exceeded'], rateLimitHeaders));

        const res = await POST(makeRequest({ altchaPayload: 'valid', lyrics: 'la la la' }));

        expect(res.status).toBe(429);
        const body = await res.json();
        expect(body.retryAfter).toBe(30);
    });

    it('returns the Lambda status code on non-429 API errors', async () => {
        mockApiPostPublic.mockRejectedValue(new ApiRequestError(400, ['Invalid payload'], new Headers()));

        const res = await POST(makeRequest({ altchaPayload: 'bad' }));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Invalid payload');
    });

    it('returns 500 on unexpected errors without triggering analytics', async () => {
        mockApiPostPublic.mockRejectedValue(new Error('network failure'));

        const res = await POST(makeRequest({ altchaPayload: 'valid', lyrics: 'la la la' }));

        expect(res.status).toBe(500);
        expect(mockWriteAnalysisEvent).not.toHaveBeenCalled();
    });
});
