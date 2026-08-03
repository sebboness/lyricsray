import { APIGatewayProxyResult } from 'aws-lambda';
import { isApiError } from './errors';
import { logger } from './logger';

export interface Result<T = unknown> {
  status: 'SUCCESS' | 'FAILURE';
  data?: T;
  errors: string[];
  message?: string;
}

export function successResult<T>(data?: T): Result<T> {
  return { status: 'SUCCESS', data, errors: [] };
}

export function errorResult(err: unknown): Result {
  if (isApiError(err)) {
    return { status: 'FAILURE', errors: err.errors() };
  }
  if (err instanceof Error) {
    return { status: 'FAILURE', errors: [err.message] };
  }
  return { status: 'FAILURE', errors: ['unknown error'] };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers':
    'Accept,Content-Type,Content-Length,Accept-Encoding,Origin,Cache-Control,X-Requested-With',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
};

// Only relevant for local/direct testing against API Gateway — production browser
// traffic goes through the Next.js BFF proxy (same-origin), not directly here.
const ALLOWED_ORIGINS = new Set([
  'http://localhost:2099',
  'https://lyricsray.com',
  'https://www.lyricsray.com',
  'https://lyricsray.hexonite.net',
]);

export function corsHeaders(origin?: string): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return { ...CORS_HEADERS, 'Access-Control-Allow-Origin': origin };
  }
  return {};
}

function respond(statusCode: number, body: unknown, origin?: string, extraHeaders?: Record<string, string>): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin), ...extraHeaders },
    body: JSON.stringify(body),
  };
}

export function ok<T>(data?: T, origin?: string, extraHeaders?: Record<string, string>): APIGatewayProxyResult {
  return respond(200, successResult(data), origin, extraHeaders);
}

export function badRequest(err: unknown, origin?: string): APIGatewayProxyResult {
  return respond(400, errorResult(err), origin);
}

export function notFound(err: unknown, origin?: string): APIGatewayProxyResult {
  return respond(404, errorResult(err), origin);
}

export function tooManyRequests(err: unknown, origin?: string, extraHeaders?: Record<string, string>): APIGatewayProxyResult {
  return respond(429, errorResult(err), origin, extraHeaders);
}

export function internalError(err: unknown, origin?: string): APIGatewayProxyResult {
  return respond(500, errorResult(err), origin);
}

export function fromError(err: unknown, origin?: string): APIGatewayProxyResult {
  logger.error('caught error', err);
  if (isApiError(err)) {
    return respond(err.statusCode, errorResult(err), origin);
  }
  return internalError(err, origin);
}

export function optionsResponse(origin?: string): APIGatewayProxyResult {
  return {
    statusCode: 204,
    headers: corsHeaders(origin),
    body: '',
  };
}
