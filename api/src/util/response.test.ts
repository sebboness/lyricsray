import { describe, it, expect } from 'vitest';
import { ok, badRequest, notFound, tooManyRequests, fromError, optionsResponse, corsHeaders } from './response';
import { ApiError } from './errors';

describe('response helpers', () => {
  it('ok() wraps data in a SUCCESS envelope', () => {
    const res = ok({ hello: 'world' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'SUCCESS', data: { hello: 'world' }, errors: [] });
  });

  it('ok() merges extra headers', () => {
    const res = ok({ a: 1 }, undefined, { 'X-RateLimit-Remaining-Hourly': '5' });
    expect(res.headers?.['X-RateLimit-Remaining-Hourly']).toBe('5');
  });

  it('badRequest() returns 400 with the error message', () => {
    const res = badRequest(ApiError.badRequest('bad input'));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).errors).toEqual(['bad input']);
  });

  it('notFound() returns 404', () => {
    const res = notFound(ApiError.notFound('thing'));
    expect(res.statusCode).toBe(404);
  });

  it('tooManyRequests() returns 429 with extra headers', () => {
    const res = tooManyRequests(ApiError.tooManyRequests('slow down'), undefined, { 'Retry-After': '60' });
    expect(res.statusCode).toBe(429);
    expect(res.headers?.['Retry-After']).toBe('60');
  });

  it('fromError() maps an ApiError to its status code', () => {
    const res = fromError(ApiError.badRequest('nope'));
    expect(res.statusCode).toBe(400);
  });

  it('fromError() maps an unknown error to 500', () => {
    const res = fromError(new Error('boom'));
    expect(res.statusCode).toBe(500);
  });

  it('optionsResponse() returns 204 with no body', () => {
    const res = optionsResponse('http://localhost:3000');
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
  });

  it('corsHeaders() only sets Allow-Origin for known origins', () => {
    expect(corsHeaders('http://localhost:3000')['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    expect(corsHeaders('https://evil.example.com')['Access-Control-Allow-Origin']).toBeUndefined();
  });
});
