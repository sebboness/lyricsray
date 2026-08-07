import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockWriteShareEvent, mockWriteCtaEvent, mockWriteLinkEvent } = vi.hoisted(() => ({
    mockWriteShareEvent: vi.fn().mockResolvedValue(undefined),
    mockWriteCtaEvent: vi.fn().mockResolvedValue(undefined),
    mockWriteLinkEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/logger/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock('@/storage/dynamodb', () => ({ getDynamoDbClient: vi.fn(() => ({})) }));
vi.mock('@/storage/AnalyticsEventStorage', () => ({
    AnalyticsEventStorage: vi.fn().mockImplementation(() => ({
        writeShareEvent: mockWriteShareEvent,
        writeCtaEvent: mockWriteCtaEvent,
        writeLinkEvent: mockWriteLinkEvent,
    })),
}));
vi.mock('@/util/request', () => ({ getClientIp: vi.fn(() => '10.0.0.1') }));
vi.mock('@/util/hash', () => ({ hashValue: vi.fn(() => 'hashedip123456789012345') }));
vi.mock('@/util/userAgent', () => ({
    parseUserAgent: vi.fn(() => ({ uaType: 'person', browser: 'Chrome', os: 'Windows' })),
}));

import { POST } from '@/app/api/track/route';

function makeRequest(body: unknown) {
    return new NextRequest('http://localhost/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'user-agent': 'Mozilla/5.0' },
        body: JSON.stringify(body),
    });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/track', () => {
    it('returns 204 and calls writeShareEvent for a valid share payload', async () => {
        const res = await POST(makeRequest({
            eventType: 'share',
            payload: { shareMethod: 'whatsapp', songKey: 'Artist/Song/hash' },
        }));

        expect(res.status).toBe(204);
        await new Promise(resolve => setTimeout(resolve, 0)); // flush void promise
        expect(mockWriteShareEvent).toHaveBeenCalledWith(expect.objectContaining({
            shareMethod: 'whatsapp',
            songKey: 'Artist/Song/hash',
            hashedIp: 'hashedip123456789012345',
        }));
    });

    it('returns 204 and calls writeCtaEvent for a valid cta payload', async () => {
        const res = await POST(makeRequest({
            eventType: 'cta',
            payload: { ctaAction: 'dismissed', ctaType: 'kofi' },
        }));

        expect(res.status).toBe(204);
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(mockWriteCtaEvent).toHaveBeenCalledWith(expect.objectContaining({
            ctaAction: 'dismissed',
            ctaType: 'kofi',
        }));
    });

    it('returns 204 and calls writeLinkEvent for a valid externalLink payload', async () => {
        const res = await POST(makeRequest({
            eventType: 'externalLink',
            payload: { linkTarget: 'kofi-profile', linkContext: 'footer' },
        }));

        expect(res.status).toBe(204);
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(mockWriteLinkEvent).toHaveBeenCalledWith(expect.objectContaining({
            linkTarget: 'kofi-profile',
            linkContext: 'footer',
        }));
    });

    it('returns 400 when eventType is not one of the allowed types', async () => {
        const res = await POST(makeRequest({ eventType: 'analysis', payload: {} }));
        expect(res.status).toBe(400);
    });

    it('returns 400 when eventType is missing', async () => {
        const res = await POST(makeRequest({ payload: { shareMethod: 'copy' } }));
        expect(res.status).toBe(400);
    });

    it('returns 400 for invalid JSON', async () => {
        const req = new NextRequest('http://localhost/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'not-json',
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('still returns 204 when the storage write throws (fire-and-forget)', async () => {
        mockWriteShareEvent.mockRejectedValueOnce(new Error('ddb down'));

        const res = await POST(makeRequest({
            eventType: 'share',
            payload: { shareMethod: 'copy', songKey: 'k' },
        }));

        // 204 is returned before the void promise resolves
        expect(res.status).toBe(204);
    });
});
