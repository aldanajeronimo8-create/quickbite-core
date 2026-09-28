export type ApiRole = 'student' | 'parent' | 'staff' | 'admin';
export type ApiUser = { id: string; email: string; role: ApiRole; roles: ApiRole[]; protected: boolean; fullName: string; sectionId?: string | null; gradeId?: string | null; courseId?: string | null; section?: string | null; grade?: string | null; course?: string | null };
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
  async login(email: string, password: string, role?: ApiRole) { const session = await this.request<ApiSession>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }, false); this.setSession(session); return session; }
  async consumeGoogleSession() { const response = await this.fetcher(this.baseUrl + '/v1/auth/google/session', { method: 'GET', credentials: 'include' }); if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(typeof body.error === 'string' ? body.error : 'google_session_missing'); } const session = await response.json() as ApiSession; this.setSession(session); return session; }
  async academicStructure() { const response = await this.fetcher(this.baseUrl + '/v1/academic/structure', { method: 'GET' }); if (!response.ok) throw new Error('academic_structure_unavailable'); return response.json() as Promise<{ sections: Array<{ id: string; name: string; grades: Array<{ id: string; name: string; courses: Array<{ id: string; name: string }> }> }> }>; }
  async googleOnboarding() { const response = await this.fetcher(this.baseUrl + '/v1/auth/google/onboarding', { method: 'GET', credentials: 'include' }); if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(typeof body.error === 'string' ? body.error : 'google_onboarding_missing'); } return response.json() as Promise<{ email: string; fullName: string }>; }
  async completeGoogleOnboarding(input: { role: 'student' | 'parent'; documentNumber: string; sectionId?: string; gradeId?: string; courseId?: string; privacyConsent: boolean }) { const response = await this.fetcher(this.baseUrl + '/v1/auth/google/complete', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }); if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(typeof body.error === 'string' ? body.error : 'google_profile_failed'); } const session = await response.json() as ApiSession; this.setSession(session); return session; }
  async switchRole(role: ApiRole) { const session = await this.request<ApiSession>('/v1/auth/role', { method: 'POST', body: JSON.stringify({ role }) }); this.setSession(session); return session; }
  async refresh() { if (!this.session) throw new Error('missing_session'); const session = await this.request<ApiSession>('/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: this.session.refreshToken }) }, false); this.setSession(session); return session; }
  async logout() { const token = this.session?.refreshToken; this.setSession(null); if (token) await this.request<void>('/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: token }) }, false); }
  menu() { return this.request<{ items: MenuItem[] }>('/v1/menu'); }
  me() { return this.request<{ user: ApiUser }>('/v1/me'); }
  orders() { return this.request<{ items: ApiOrder[] }>('/v1/orders'); }
  preferences() { return this.request<{ preferences: { theme: 'light' | 'dark' | 'system' } }>('/v1/preferences'); }
  updatePreferences(theme: 'light' | 'dark' | 'system') { return this.request<{ preferences: { theme: 'light' | 'dark' | 'system' } }>('/v1/preferences', { method: 'PUT', body: JSON.stringify({ theme }) }); }
  adminUsers() { return this.request<{ items: Array<ApiUser & { active: boolean; created_at: string; updated_at: string }> }>('/v1/admin/users'); }
  adminRecessSchedules() { return this.request<{ sections: Array<{ id: string; name: string; display_order: number }>; grades: Array<{ id: string; section_id: string; name: string; display_order: number }>; courses: Array<{ id: string; grade_id: string; name: string; display_order: number }>; schedules: Array<{ id: string; name: string; weekday: number; start_time: string; end_time: string; active: boolean; priority: number; notes: string | null; created_at: string; updated_at: string }>; targets: Array<{ id: string; recess_schedule_id: string; section_id: string | null; grade_id: string | null; course_id: string | null }>; }>('/v1/admin/recess-schedules'); }
  createRecessSchedule(input: { name: string; weekday: number; startTime: string; endTime: string; scope: 'section' | 'grade' | 'course'; sectionId?: string; gradeId?: string; courseId?: string; notes?: string | null }) { return this.request<{ schedule: { id: string } }>('/v1/admin/recess-schedules', { method: 'POST', body: JSON.stringify(input) }); }
  toggleRecessSchedule(id: string) { return this.request<{ schedule: { id: string; active: boolean } }>('/v1/admin/recess-schedules/' + id, { method: 'PATCH', body: JSON.stringify({ action: 'toggle' }) }); }
  deleteRecessSchedule(id: string) { return this.request<void>('/v1/admin/recess-schedules/' + id, { method: 'DELETE' }); }

  updateOrderStatus(orderId: string, status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled') { return this.request<{ order: ApiOrder }>('/v1/orders/' + orderId, { method: 'PATCH', body: JSON.stringify({ status }) }); }
  familyChildren() { return this.request<{ items: Array<{ id: string; email: string; full_name: string; status: string; created_at: string }> }>('/v1/family/children'); }
  updateAdminUser(input: { id: string; email: string; fullName: string; role?: ApiRole; password?: string }) { return this.request<{ user: ApiUser }>('/v1/admin/users/' + input.id, { method: 'PATCH', body: JSON.stringify(input) }); }
  createInternalUser(input: { email: string; fullName: string; role: 'staff' | 'admin'; password: string }) { return this.request<{ user: ApiUser }>('/v1/admin/users', { method: 'POST', body: JSON.stringify(input) }); }
  updateProtectedCredentials(input: { id: string; email: string; password?: string }) { return this.request<{ user: { id: string; email: string } }>('/v1/admin/users/' + input.id + '/protected-credentials', { method: 'POST', body: JSON.stringify(input) }); }
  createOrder(items: Array<{ productId: string; quantity: number }>, paymentMethod: string, idempotencyKey: string) {
    return this.request<{ order: ApiOrder }>('/v1/orders', { method: 'POST', body: JSON.stringify({ items: items.map(({ productId, quantity }) => ({ product_id: productId, quantity })), paymentMethod, idempotencyKey }) });
  }
}

export function quickbiteApi(baseUrl = import.meta.env.VITE_API_BASE_URL) {
  const productionBaseUrl = typeof window !== 'undefined' && import.meta.env.PROD
    ? window.location.origin
    : baseUrl;

  if (!productionBaseUrl) throw new Error('VITE_API_BASE_URL is required for QuickBite Core API in local development');
  return new QuickBiteApi(productionBaseUrl.replace(/\/$/, ''));
}
