export type ApiUser = { id: string; email: string; role: 'student' | 'parent' | 'admin' | 'both' | 'student_parent'; fullName: string };
export type ApiSession = { accessToken: string; refreshToken: string; expiresIn: number; user: ApiUser };
export type MenuItem = { id: string; name: string; description: string | null; price: number; category_id: string | null; category_name: string | null; stock: number };
export type ApiOrder = { id: string; user_id: string; total: number; status: string; payment_status: string; payment_method: string; pickup_code: string; created_at: string };

type Fetcher = typeof fetch;
const STORAGE_KEY = 'quickbite.core.session';

export class QuickBiteApi {
  private session: ApiSession | null = null;
  constructor(private readonly baseUrl: string, private readonly fetcher: Fetcher = fetch) {
    if (typeof window !== 'undefined') {
      try { const raw = window.sessionStorage.getItem(STORAGE_KEY); if (raw) this.session = JSON.parse(raw) as ApiSession; } catch { this.session = null; }
    }
  }
  private persist() {
    if (typeof window === 'undefined') return;
    if (this.session) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  }
  setSession(session: ApiSession | null) { this.session = session; this.persist(); }
  getSession() { return this.session; }
  private async request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('content-type', 'application/json');
    if (this.session) headers.set('authorization', `Bearer ${this.session.accessToken}`);
    let response = await this.fetcher(`${this.baseUrl}${path}`, { ...options, headers });
    if (response.status === 401 && retry && this.session?.refreshToken) {
      try { await this.refresh(); } catch { this.setSession(null); throw new Error('session_expired'); }
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set('content-type', 'application/json');
      retryHeaders.set('authorization', `Bearer ${this.session!.accessToken}`);
      response = await this.fetcher(`${this.baseUrl}${path}`, { ...options, headers: retryHeaders });
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(typeof body.error === 'string' ? body.error : `request_failed_${response.status}`);
    }
    return response.status === 204 ? undefined as T : await response.json() as T;
  }
  async login(email: string, password: string) { const session = await this.request<ApiSession>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false); this.setSession(session); return session; }
  async refresh() { if (!this.session) throw new Error('missing_session'); const session = await this.request<ApiSession>('/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: this.session.refreshToken }) }, false); this.setSession(session); return session; }
  async logout() { const token = this.session?.refreshToken; this.setSession(null); if (token) await this.request<void>('/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: token }) }, false); }
  menu() { return this.request<{ items: MenuItem[] }>('/v1/menu'); }
  me() { return this.request<{ user: ApiUser }>('/v1/me'); }
  orders() { return this.request<{ items: ApiOrder[] }>('/v1/orders'); }
  createOrder(items: Array<{ productId: string; quantity: number }>, paymentMethod: string, idempotencyKey: string) {
    return this.request<{ order: ApiOrder }>('/v1/orders', { method: 'POST', body: JSON.stringify({ items: items.map(({ productId, quantity }) => ({ product_id: productId, quantity })), paymentMethod, idempotencyKey }) });
  }
}

export function quickbiteApi(baseUrl = import.meta.env.VITE_API_BASE_URL) {
  if (!baseUrl) throw new Error('VITE_API_BASE_URL is required for QuickBite Core API');
  return new QuickBiteApi(baseUrl.replace(/\/$/, ''));
}
