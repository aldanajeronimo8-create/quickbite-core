import { quickbiteApi, QuickBiteApiError } from './quickbiteApi';

export interface QuickBiteAuthUser {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  active?: boolean;
  student_code?: string | null;
  section_id?: string | null;
  grade_id?: string | null;
  course_id?: string | null;
}

export interface QuickBiteAuthSession {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  user: QuickBiteAuthUser;
}

const STORAGE_KEY = 'quickbite.api.auth.session';

function loadSession(): QuickBiteAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as QuickBiteAuthSession : null;
  } catch { return null; }
}

function saveSession(session: QuickBiteAuthSession | null) {
  if (typeof window === 'undefined') return;
  if (session) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else window.sessionStorage.removeItem(STORAGE_KEY);
}

function toSession(data: { accessToken: string; refreshToken: string; accessTokenExpiresIn: number; refreshTokenExpiresIn: number; user: QuickBiteAuthUser }): QuickBiteAuthSession {
  const now = Date.now();
  return {
    ...data,
    accessTokenExpiresAt: now + data.accessTokenExpiresIn * 1000,
    refreshTokenExpiresAt: now + data.refreshTokenExpiresIn * 1000,
  };
}

export function getStoredAuthSession() {
  return loadSession();
}

export async function apiLogin(email: string, password: string) {
  const data = await quickbiteApi<{
    accessToken: string; refreshToken: string;
    accessTokenExpiresIn: number; refreshTokenExpiresIn: number;
    user: QuickBiteAuthUser;
  }>('/v1/auth/login', { method: 'POST', body: { email: email.trim().toLowerCase(), password } });
  const session = toSession(data);
  saveSession(session);
  return session;
}

export async function apiRefresh() {
  const current = loadSession();
  if (!current?.refreshToken || current.refreshTokenExpiresAt <= Date.now()) {
    saveSession(null);
    return null;
  }
  try {
    const data = await quickbiteApi<{
      accessToken: string; refreshToken: string;
      accessTokenExpiresIn: number; refreshTokenExpiresIn: number;
    }>('/v1/auth/refresh', { method: 'POST', body: { refreshToken: current.refreshToken } });
    const session = toSession({ ...data, user: current.user });
    saveSession(session);
    return session;
  } catch (error) {
    if (error instanceof QuickBiteApiError && error.status === 401) saveSession(null);
    throw error;
  }
}

export async function getValidAccessToken() {
  const session = loadSession();
  if (!session) return null;
  if (session.accessTokenExpiresAt > Date.now() + 30_000) return session.accessToken;
  const refreshed = await apiRefresh();
  return refreshed?.accessToken ?? null;
}

export async function apiLogout() {
  const session = loadSession();
  try {
    if (session?.accessToken) {
      await quickbiteApi('/v1/auth/logout', { method: 'POST', accessToken: session.accessToken });
    }
  } finally {
    saveSession(null);
  }
}
