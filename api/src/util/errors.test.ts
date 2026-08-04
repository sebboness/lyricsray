import { describe, it, expect } from 'vitest';
import { ApiError, isApiError } from './errors';

describe('ApiError', () => {
  it('defaults clientMessage to message when not provided', () => {
    const err = new ApiError('internal detail', 500);
    expect(err.clientMessage).toBe('internal detail');
    expect(err.errors()).toEqual(['internal detail']);
  });

  it('keeps message and clientMessage distinct when both are provided', () => {
    const err = new ApiError('internal detail', 500, 'safe message');
    expect(err.message).toBe('internal detail');
    expect(err.clientMessage).toBe('safe message');
    expect(err.errors()).toEqual(['safe message']);
  });

  it('defaults statusCode to 500', () => {
    const err = new ApiError('oops');
    expect(err.statusCode).toBe(500);
  });

  describe('static factories', () => {
    it('badRequest() sets statusCode 400 and mirrors the message', () => {
      const err = ApiError.badRequest('bad input');
      expect(err.statusCode).toBe(400);
      expect(err.clientMessage).toBe('bad input');
    });

    it('notFound() sets statusCode 404 with a "<resource> not found" message', () => {
      const err = ApiError.notFound('user');
      expect(err.statusCode).toBe(404);
      expect(err.clientMessage).toBe('user not found');
    });

    it('unauthorized() defaults to a generic "unauthorized" message', () => {
      const err = ApiError.unauthorized();
      expect(err.statusCode).toBe(401);
      expect(err.clientMessage).toBe('unauthorized');
    });

    it('unauthorized() accepts a custom message', () => {
      const err = ApiError.unauthorized('session expired');
      expect(err.statusCode).toBe(401);
      expect(err.clientMessage).toBe('session expired');
    });

    it('tooManyRequests() sets statusCode 429', () => {
      const err = ApiError.tooManyRequests('slow down');
      expect(err.statusCode).toBe(429);
      expect(err.clientMessage).toBe('slow down');
    });

    it('internal() sets statusCode 500 and hides the detailed message from clientMessage', () => {
      const err = ApiError.internal('stack trace details');
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('stack trace details');
      expect(err.clientMessage).toBe('internal server error');
    });
  });
});

describe('isApiError', () => {
  it('returns true for an ApiError instance', () => {
    expect(isApiError(ApiError.badRequest('x'))).toBe(true);
  });

  it('returns false for a plain Error', () => {
    expect(isApiError(new Error('x'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isApiError('x')).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
  });
});
