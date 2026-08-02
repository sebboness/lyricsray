import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockApiPostPublic } = vi.hoisted(() => ({
    mockApiPostPublic: vi.fn(),
}));

vi.mock('@/logger/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
    return { ...actual, apiPostPublic: mockApiPostPublic };
});

import { POST } from '@/app/api/search-song/route';
import { ApiRequestError } from '@/lib/api';

function makeRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/search-song', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('POST /api/search-song (BFF proxy)', () => {
    it('proxies the request body to the Lambda API and returns its data', async () => {
        mockApiPostPublic.mockResolvedValue({ data: { songs: [{ id: '1', title: 'Hello' }] }, headers: new Headers() });

        const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Hello', artist: 'Adele' }));

        expect(mockApiPostPublic).toHaveBeenCalledWith('/v1/search-song', { altchaPayload: 'valid', songName: 'Hello', artist: 'Adele' });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.songs).toEqual([{ id: '1', title: 'Hello' }]);
    });

    it('forwards the Lambda API status code and error message on failure', async () => {
        mockApiPostPublic.mockRejectedValue(new ApiRequestError(400, ['Human verification failed'], new Headers()));

        const res = await POST(makeRequest({ songName: 'Hello' }));

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Human verification failed');
    });

    it('returns a generic 500 when the proxy call throws an unexpected error', async () => {
        mockApiPostPublic.mockRejectedValue(new Error('network error'));

        const res = await POST(makeRequest({ altchaPayload: 'valid', songName: 'Hello' }));

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('Failed to search songs. Please try pasting lyrics directly.');
    });
});
