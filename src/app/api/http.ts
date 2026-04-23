import { buildApiUrl } from './config';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type AuthStateHandlers = {
  getAccessToken?: () => string | null;
  onUnauthorized?: () => void;
};

type RequestJsonOptions = Omit<RequestInit, 'method'> & {
  method?: HttpMethod;
  skipAuth?: boolean;
  skipUnauthorizedRedirect?: boolean;
};

const authStateHandlers: AuthStateHandlers = {};

export function configureHttpAuthHandlers(handlers: AuthStateHandlers): void {
  authStateHandlers.getAccessToken = handlers.getAccessToken;
  authStateHandlers.onUnauthorized = handlers.onUnauthorized;
}

export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body?: unknown;

  constructor(params: { status: number; statusText: string; body?: unknown; message?: string }) {
    super(params.message ?? `HTTP ${params.status} ${params.statusText}`);
    this.name = 'HttpError';
    this.status = params.status;
    this.statusText = params.statusText;
    this.body = params.body;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  try {
    return await response.text();
  } catch {
    return undefined;
  }
}

/**
 * Minimal JSON-first request helper.
 *
 * Not used by current mock services yet; intended for incremental adoption.
 */
export async function requestJson<TResponse>(
  path: string,
  init: RequestJsonOptions = {},
): Promise<TResponse> {
  const url = buildApiUrl(path);
  const { skipAuth, skipUnauthorizedRedirect, ...requestInit } = init;

  const headers = new Headers(requestInit.headers);
  if (!headers.has('accept')) headers.set('accept', 'application/json');

  if (!skipAuth) {
    const accessToken = authStateHandlers.getAccessToken?.();
    if (accessToken && !headers.has('authorization')) {
      headers.set('authorization', `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(url, { ...requestInit, headers });

  if (!response.ok) {
    const body = await readResponseBody(response);
    const message = isRecord(body) && typeof body.message === 'string' ? body.message : undefined;

    if (response.status === 401 && !skipUnauthorizedRedirect) {
      authStateHandlers.onUnauthorized?.();
    }

    throw new HttpError({
      status: response.status,
      statusText: response.statusText,
      body,
      message,
    });
  }

  // 204 No Content
  if (response.status === 204) return undefined as TResponse;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    // If the backend doesn't return JSON, still allow callers to decide how to handle it later.
    return (await response.text()) as unknown as TResponse;
  }

  return (await response.json()) as TResponse;
}

export async function getJson<TResponse>(path: string, init: Omit<RequestJsonOptions, 'method'> = {}): Promise<TResponse> {
  return requestJson<TResponse>(path, { ...init, method: 'GET' });
}

export async function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
  init: Omit<RequestJsonOptions, 'method' | 'body'> = {},
): Promise<TResponse> {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');

  return requestJson<TResponse>(path, {
    ...init,
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

export async function patchJson<TResponse, TBody>(
  path: string,
  body: TBody,
  init: Omit<RequestJsonOptions, 'method' | 'body'> = {},
): Promise<TResponse> {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');

  return requestJson<TResponse>(path, {
    ...init,
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
}

export async function putJson<TResponse, TBody>(
    path: string,
    body: TBody,
  init: Omit<RequestJsonOptions, 'method' | 'body'> = {},
): Promise<TResponse> {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');

  return requestJson<TResponse>(path, {
    ...init,
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
}

export async function deleteJson<TResponse>(
  path: string,
  init: Omit<RequestJsonOptions, 'method'> = {},
): Promise<TResponse> {
  return requestJson<TResponse>(path, { ...init, method: 'DELETE' });
}
