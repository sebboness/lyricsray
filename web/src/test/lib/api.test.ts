import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiGetPublic, apiPostPublic, apiGetAuthed, apiPostAuthed, ApiRequestError, forwardHeaders } from '@/lib/api';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: new Headers(headers),
        json: async () => body,
    } as Response;
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('apiGetPublic / apiPostPublic', () => {
    it('apiGetPublic does not attach an Authorization header', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { status: 'SUCCESS', data: { ok: true }, errors: [] }));

        await apiGetPublic('/v1/health');

        const [, init] = (global.fetch as any).mock.calls[0];
        expect(init.headers?.Authorization).toBeUndefined();
    });

    it('apiPostPublic sends a JSON body without an Authorization header', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { status: 'SUCCESS', data: {}, errors: [] }));

        await apiPostPublic('/v1/search-song', { songName: 'x' });

        const [, init] = (global.fetch as any).mock.calls[0];
        expect(init.method).toBe('POST');
        expect(init.headers.Authorization).toBeUndefined();
        expect(JSON.parse(init.body)).toEqual({ songName: 'x' });
    });
});

describe('apiGetAuthed / apiPostAuthed', () => {
    it('apiGetAuthed attaches a Bearer token', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { status: 'SUCCESS', data: { ok: true }, errors: [] }));

        await apiGetAuthed('/v1/admin/me', 'the-id-token');

        const [url, init] = (global.fetch as any).mock.calls[0];
        expect(init.method).toBe('GET');
        expect(init.headers.Authorization).toBe('Bearer the-id-token');
        expect(url).toContain('/v1/admin/me');
    });

    it('apiPostAuthed attaches a Bearer token and JSON body', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { status: 'SUCCESS', data: { ok: true }, errors: [] }));

        await apiPostAuthed('/v1/admin/action', 'the-id-token', { foo: 'bar' });

        const [, init] = (global.fetch as any).mock.calls[0];
        expect(init.headers.Authorization).toBe('Bearer the-id-token');
        expect(init.headers['Content-Type']).toBe('application/json');
        expect(JSON.parse(init.body)).toEqual({ foo: 'bar' });
    });

    it('returns the parsed data on success', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(200, { status: 'SUCCESS', data: { hello: 'world' }, errors: [] }));

        const result = await apiGetAuthed<{ hello: string }>('/v1/admin/me', 'token');

        expect(result.data).toEqual({ hello: 'world' });
    });

    it('throws ApiRequestError when the HTTP status is not ok, even with a SUCCESS-shaped body', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(500, { status: 'SUCCESS', data: {}, errors: [] }));

        await expect(apiGetAuthed('/v1/admin/me', 'token')).rejects.toBeInstanceOf(ApiRequestError);
    });

    it('throws ApiRequestError with the response errors when status is FAILURE', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(401, { status: 'FAILURE', errors: ['unauthorized'] }));

        await expect(apiGetAuthed('/v1/admin/me', 'expired-token')).rejects.toMatchObject({
            statusCode: 401,
            errors: ['unauthorized'],
        });
    });

    it('ApiRequestError falls back to a generic message when errors[] is empty', async () => {
        (global.fetch as any).mockResolvedValue(jsonResponse(500, { status: 'FAILURE', errors: [] }));

        await expect(apiGetAuthed('/v1/admin/me', 'token')).rejects.toMatchObject({
            message: 'API request failed with status 500',
        });
    });
});

describe('forwardHeaders', () => {
    it('copies only the requested headers that are present', () => {
        const source = new Headers({ 'X-RateLimit-Remaining-Hourly': '5', 'X-Other': 'ignored' });

        const result = forwardHeaders(source, ['X-RateLimit-Remaining-Hourly', 'X-Missing']);

        expect(result).toEqual({ 'X-RateLimit-Remaining-Hourly': '5' });
    });
});
