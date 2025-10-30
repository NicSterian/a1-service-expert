import { getAuthToken } from './auth';

type RequestOptions = RequestInit & { skipAuth?: boolean };

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers);

  if (!options.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : (undefined as T);

  if (!response.ok) {
    const payload = data as Record<string, unknown> | undefined;
    const errorMessage = payload?.message ?? response.statusText;
    if (Array.isArray(payload?.errors) && payload?.errors.length) {
      const firstError = payload.errors[0] as { field?: string; errors?: string[] };
      const detail = [firstError?.field, firstError?.errors?.[0]].filter(Boolean).join(': ');
      const combined = detail ? `${String(errorMessage)} — ${detail}` : String(errorMessage);
      throw new Error(combined);
    }
    throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Request failed');
  }

  return data;
}

export const apiGet = <T>(path: string, options?: RequestOptions) =>
  request<T>(path, { method: 'GET', ...options });

export const apiPost = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

export const apiPatch = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  request<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

export const apiDelete = <T>(path: string, options?: RequestOptions) =>
  request<T>(path, { method: 'DELETE', ...options });

export const apiPut = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  request<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
