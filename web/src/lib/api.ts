const API_URL = (process.env.API_URL ?? '').replace(/\/$/, '');

interface ApiEnvelope<T> {
  status: 'SUCCESS' | 'FAILURE';
  data?: T;
  errors: string[];
  message?: string;
}

export interface ApiResult<T> {
  data: T;
  headers: Headers;
}

export class ApiRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errors: string[],
    public readonly headers: Headers,
  ) {
    super(errors.join('; ') || `API request failed with status ${statusCode}`);
    this.name = 'ApiRequestError';
  }
}

/**
 * Copies a subset of headers from the Lambda API's response onto the
 * NextResponse being returned to the browser (e.g. rate-limit headers).
 */
export function forwardHeaders(source: Headers, names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const value = source.get(name);
    if (value !== null) out[name] = value;
  }
  return out;
}

async function handleResponse<T>(res: Response): Promise<ApiResult<T>> {
  const body: ApiEnvelope<T> = await res.json();

  if (!res.ok || body.status === 'FAILURE') {
    throw new ApiRequestError(res.status, body.errors ?? [], res.headers);
  }

  return { data: body.data as T, headers: res.headers };
}

export async function apiGetPublic<T>(path: string): Promise<ApiResult<T>> {
  const res = await fetch(`${API_URL}${path}`, { method: 'GET' });
  return handleResponse<T>(res);
}

export async function apiPostPublic<T>(path: string, payload: unknown): Promise<ApiResult<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<T>(res);
}
