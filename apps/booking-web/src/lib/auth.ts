const STORAGE_KEY = 'authToken';
const AUTH_EVENT = 'auth-token-changed';

export function setAuthToken(token: string) {
  localStorage.setItem(STORAGE_KEY, token);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearAuthToken() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getAuthToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export const AUTH_EVENT_NAME = AUTH_EVENT;
export const getToken = getAuthToken;

