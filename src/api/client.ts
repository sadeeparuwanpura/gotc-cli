import type { ApiErrorBody, ErrorCode } from './types';

const BASE: string = import.meta.env.VITE_API_BASE ?? '/api';

/**
 * The server's error envelope, carried as a throwable.
 *
 * `message` is final copy written by the design spec — screens put it straight into a
 * notice strip or under a field. Never reword it, never wrap it in "Error: ".
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(status: number, code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the session is gone and the route guard should send us to /login. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = (value as { error?: unknown }).error;
  if (typeof candidate !== 'object' || candidate === null) return false;
  const { code, message } = candidate as { code?: unknown; message?: unknown };
  return typeof code === 'string' && typeof message === 'string';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      // The JWT lives in an httpOnly cookie; the client never sees a token.
      credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...(signal ? { signal } : {})
    });
  } catch (cause) {
    // An abort is a cancellation, not a failure. It has to travel untouched so the query
    // layer can tell the two apart — wrapping it leaves the screen stuck on a dead query.
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    throw new ApiError(0, 'INTERNAL', 'Could not reach the server. Is it running on port 4000?');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isErrorBody(payload)) {
      throw new ApiError(
        response.status,
        payload.error.code,
        payload.error.message,
        payload.error.details
      );
    }
    throw new ApiError(response.status, 'INTERNAL', 'Something went wrong on the server.');
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal): Promise<T> =>
    request<T>(path, signal ? { signal } : {}),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body: unknown): Promise<T> => request<T>(path, { method: 'PATCH', body }),
  delete: (path: string): Promise<void> => request<void>(path, { method: 'DELETE' })
};

/** Builds a query string, dropping empty values so `?q=` never appears. */
export function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}
