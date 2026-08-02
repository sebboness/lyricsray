import { describe, it, expect } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getClientIp } from './request';

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    headers: {},
    requestContext: { identity: {} } as any,
    ...overrides,
  } as APIGatewayProxyEvent;
}

describe('getClientIp', () => {
  it('prefers the API Gateway sourceIp over any forwarded header', () => {
    const event = makeEvent({
      headers: { 'x-forwarded-for': '10.0.0.1' },
      requestContext: { identity: { sourceIp: '203.0.113.5' } } as any,
    });
    // sourceIp is authoritative — a spoofed x-forwarded-for must not override it,
    // since this value feeds the rate limiter.
    expect(getClientIp(event)).toBe('203.0.113.5');
  });

  it('falls back to x-forwarded-for when sourceIp is missing', () => {
    const event = makeEvent({
      headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
      requestContext: { identity: {} } as any,
    });
    expect(getClientIp(event)).toBe('10.0.0.1');
  });

  it('falls back to the X-Forwarded-For header with capitalized casing', () => {
    const event = makeEvent({
      headers: { 'X-Forwarded-For': '198.51.100.1' },
      requestContext: { identity: {} } as any,
    });
    expect(getClientIp(event)).toBe('198.51.100.1');
  });

  it('returns "unknown" when no IP information is available', () => {
    const event = makeEvent();
    expect(getClientIp(event)).toBe('unknown');
  });
});
