import { environment } from '../../config/environment';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload?: unknown,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function responseFieldErrors(payload: unknown): Record<string, string[]> {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) return {};
  const error = payload.error;
  if (!error || typeof error !== 'object' || !('fieldErrors' in error)) return {};
  const candidate = error.fieldErrors;
  if (!candidate || typeof candidate !== 'object') return {};

  return Object.fromEntries(
    Object.entries(candidate).flatMap(([field, messages]) => {
      if (!Array.isArray(messages)) return [];
      const validMessages = messages.filter(
        (message): message is string => typeof message === 'string',
      );
      return validMessages.length ? [[field, validMessages]] : [];
    }),
  );
}

function responseErrorMessage(
  payload: unknown,
  status: number,
  fieldErrors: Record<string, string[]>,
): string {
  const firstFieldError = Object.entries(fieldErrors)[0];
  if (firstFieldError) {
    const [field, messages] = firstFieldError;
    const label = field
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (value) => value.toUpperCase());
    return `${label}: ${messages[0]}`;
  }
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = payload.error;
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
  }
  return `API request failed: ${status}`;
}

interface RequestOptions extends RequestInit {
  token?: string;
  applicationToken?: string;
  /** Milliseconds a successful GET may be reused. Set to 0 to bypass caching. */
  cacheTtlMs?: number;
  /** Always perform the request, even when a fresh cached GET exists. */
  forceRefresh?: boolean;
}

type CachedResponse = { expiresAt: number; value: unknown };

const DEFAULT_GET_CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 150;
const responseCache = new Map<string, CachedResponse>();
const requestsInFlight = new Map<string, Promise<unknown>>();

function requestIdentity(url: string, options: RequestOptions) {
  // Authentication is part of the identity so data is never shared between
  // signed-in parents or application drafts.
  return [
    String(options.method ?? 'GET').toUpperCase(),
    url,
    options.token ?? '',
    options.applicationToken ?? '',
  ].join('|');
}

function clearExpiredCache(now = Date.now()) {
  for (const [key, cached] of responseCache) {
    if (cached.expiresAt <= now) responseCache.delete(key);
  }
  while (responseCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    responseCache.delete(oldestKey);
  }
}

/** Clear cached reads after a write or when the signed-in user changes. */
export function invalidateApiCache() {
  responseCache.clear();
}

function buildApiUrl(path: string): string {
  const baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  const queryIndex = path.indexOf('?');
  const pathname = (queryIndex >= 0 ? path.slice(0, queryIndex) : path).replace(/^\/+|\/+$/g, '');
  const query = queryIndex >= 0 ? path.slice(queryIndex) : '';

  // The dashboard currently enables Next.js `trailingSlash`. Calling the
  // canonical URL directly avoids 308 redirects, especially for mobile POSTs.
  return `${baseUrl}/${pathname}/${query}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = String(options.method ?? 'GET').toUpperCase();
  const isGet = method === 'GET';
  const requestUrl = buildApiUrl(path);
  const key = requestIdentity(requestUrl, options);
  const now = Date.now();

  if (isGet && !options.forceRefresh) {
    clearExpiredCache(now);
    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > now) return cached.value as T;
    const existing = requestsInFlight.get(key);
    if (existing) return existing as Promise<T>;
  }

  const request = performApiRequest<T>(requestUrl, options, method);
  if (isGet) requestsInFlight.set(key, request);

  try {
    const result = await request;
    if (isGet) {
      const ttl = options.cacheTtlMs ?? DEFAULT_GET_CACHE_TTL_MS;
      if (ttl > 0) responseCache.set(key, { expiresAt: Date.now() + ttl, value: result });
    } else {
      // A mutation can affect several aggregate endpoints (feed, payments,
      // forms, orders). Clearing the small in-memory cache keeps them correct.
      invalidateApiCache();
    }
    return result;
  } finally {
    if (isGet) requestsInFlight.delete(key);
  }
}

async function performApiRequest<T>(
  requestUrl: string,
  options: RequestOptions,
  method: string,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), environment.requestTimeoutMs);
  const {
    token,
    applicationToken,
    cacheTtlMs: _cacheTtlMs,
    forceRefresh: _forceRefresh,
    ...fetchOptions
  } = options;

  try {
    if (__DEV__) {
      // Deliberately omit headers: an auth token must never reach device logs.
      console.info(`[Mobsie API] ${method} ${requestUrl}`);
    }
    const response = await fetch(requestUrl, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(applicationToken ? { 'X-Application-Token': applicationToken } : {}),
        ...fetchOptions.headers,
      },
    });

    const payload = await response.json().catch(() => undefined);
    if (__DEV__) {
      console.info(`[Mobsie API] ${response.status} ${method} ${requestUrl}`);
    }
    if (!response.ok) {
      const fieldErrors = responseFieldErrors(payload);
      throw new ApiError(
        responseErrorMessage(payload, response.status, fieldErrors),
        response.status,
        payload,
        fieldErrors,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        `The API did not respond within ${Math.round(environment.requestTimeoutMs / 1000)} seconds. Check that ${requestUrl} is reachable and that the dashboard server is running.`,
        0,
        error,
      );
    }
    throw new ApiError(
      `Could not connect to ${requestUrl}. Make sure the dashboard is running with "npm run dev -- --hostname 0.0.0.0" and both devices are on the same Wi-Fi.`,
      0,
      error,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiData<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = await apiRequest<{ ok: true; data: T }>(path, options);
  return payload.data;
}
