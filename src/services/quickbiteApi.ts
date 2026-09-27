import { appConfig } from '../config/appConfig';

export class QuickBiteApiError extends Error {
  constructor(message: string, public status: number, public requestId?: string) {
    super(message);
    this.name = 'QuickBiteApiError';
  }
}

export function isQuickBiteApiConfigured() {
  return Boolean(appConfig.apiBaseUrl.trim());
}

export async function quickbiteApi<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; accessToken?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const base = appConfig.apiBaseUrl.trim().replace(/\/$/, '');
  if (!base) throw new Error('VITE_API_BASE_URL no esta configurada.');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.accessToken) headers.Authorization = 'Bearer ' + options.accessToken;
  const response = await fetch(base + path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
  const requestId = response.headers.get('X-Request-Id') ?? undefined;
  const payload = await response.json().catch(() => ({})) as { data?: T; error?: string; requestId?: string };
  if (!response.ok) {
    throw new QuickBiteApiError(payload.error ?? 'Error en la API de QuickBite.', response.status, requestId ?? payload.requestId);
  }
  return payload.data as T;
}
