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
    const label = field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (value) => value.toUpperCase());
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
}

function buildApiUrl(path: string): string {
  const baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  const queryIndex = path.indexOf('?');
  const pathname = (queryIndex >= 0 ? path.slice(0, queryIndex) : path)
    .replace(/^\/+|\/+$/g, '');
  const query = queryIndex >= 0 ? path.slice(queryIndex) : '';

  // The dashboard currently enables Next.js `trailingSlash`. Calling the
  // canonical URL directly avoids 308 redirects, especially for mobile POSTs.
  return `${baseUrl}/${pathname}/${query}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), environment.requestTimeoutMs);
  const requestUrl = buildApiUrl(path);

  try {
    const response = await fetch(requestUrl, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.applicationToken
          ? { 'X-Application-Token': options.applicationToken }
          : {}),
        ...options.headers,
      },
    });

    const payload = await response.json().catch(() => undefined);
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
