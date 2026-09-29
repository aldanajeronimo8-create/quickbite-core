export type ApiRole = 'student' | 'parent' | 'staff' | 'admin';
export type ApiUser = { id: string; email: string; role: ApiRole; roles: ApiRole[]; protected: boolean; fullName: string; sectionId?: string | null; gradeId?: string | null; courseId?: string | null; section?: string | null; grade?: string | null; course?: string | null };
export type ApiSession = { accessToken: string; refreshToken: string; expiresIn: number; user: ApiUser };
export type MenuItem = { id: string; name: string; description: string | null; price: number; category_id: string | null; category_name: string | null; stock: number; image_url?: string | null; available?: boolean };
export type ApiOrder = { id: string; user_id: string; beneficiary_user_id?: string | null; total: number; status: string; payment_status: string; payment_method: string; pickup_code: string; order_number?: string; created_at: string; estimated_minutes?: number; payment_reference?: string | null; notes?: string | null; student_comment?: string | null; admin_hidden?: boolean; order_items?: Array<{ id: string; product_id: string; quantity: number; price: number; product?: unknown }> };

type Fetcher = typeof fetch;
const STORAGE_KEY = 'quickbite.core.session';

export class QuickBiteApi {
  private session: ApiSession | null = null;
  constructor(private readonly baseUrl: string, private readonly fetcher: Fetcher = globalThis.fetch.bind(globalThis)) {
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
  async registerParent(input: { fullName: string; email: string; password: string; documentNumber: string; privacyConsent: boolean }) { const session = await this.request<ApiSession>('/v1/auth/register', { method: 'POST', body: JSON.stringify({ ...input, role: 'parent' }) }, false); this.setSession(session); return session; }
  async registerStudent(input: { fullName: string; email: string; password: string; documentNumber: string; sectionId: string; gradeId: string; courseId: string; guardianName: string; guardianRelationship: string; guardianEmail: string; studentAcknowledged: boolean; guardianAuthorized: boolean }) { const session = await this.request<ApiSession>('/v1/auth/register', { method: 'POST', body: JSON.stringify({ ...input, role: 'student', privacyConsent: input.studentAcknowledged && input.guardianAuthorized }) }, false); this.setSession(session); return session; }
  async exchangeFirebaseToken(idToken: string) {
    const response = await this.fetcher(this.baseUrl + '/v1/auth/firebase/exchange', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 202) return body as { status: 'onboarding_required'; email: string; fullName: string };
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'firebase_auth_failed');
    const session = body as ApiSession;
    this.setSession(session);
    return { status: 'authenticated' as const, session };
  }

  async firebaseOnboarding() {
    const response = await this.fetcher(this.baseUrl + '/v1/auth/firebase/onboarding', {
      method: 'GET',
      credentials: 'include',
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'firebase_onboarding_missing');
    return body as { email: string; fullName: string };
  }

  async completeFirebaseOnboarding(input: {
    role: 'student' | 'parent';
    documentNumber: string;
    sectionId?: string;
    gradeId?: string;
    courseId?: string;
    guardianName?: string;
    guardianRelationship?: string;
    guardianEmail?: string;
    studentAcknowledged?: boolean;
    guardianAuthorized?: boolean;
    privacyConsent: boolean;
  }) {
    const response = await this.fetcher(this.baseUrl + '/v1/auth/firebase/complete', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'firebase_profile_failed');
    const session = body as ApiSession;
    this.setSession(session);
    return session;
  }

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
  wallet() { return this.request<{ balance: number }>('/v1/wallet'); }
  notifications() { return this.request<{ items: Array<{ id: string; user_id: string; order_id?: string | null; type?: string; title: string; body: string; read_at?: string | null; created_at: string }> }>('/v1/notifications'); }
  markNotificationRead(notificationId: string) { return this.request<{ notification: unknown }>('/v1/notifications/' + notificationId + '/read', { method: 'POST' }); }
  favorites() { return this.request<{ items: Array<{ product_id: string; name: string; description: string | null; price: number; category_name: string | null }> }>('/v1/favorites'); }
  addFavorite(productId: string) { return this.request<{ productId: string }>('/v1/favorites', { method: 'POST', body: JSON.stringify({ productId }) }); }
  removeFavorite(productId: string) { return this.request<void>('/v1/favorites/' + productId, { method: 'DELETE' }); }
  preferences() { return this.request<{ preferences: { theme: 'light' | 'dark' | 'system' } }>('/v1/preferences'); }
  updatePreferences(theme: 'light' | 'dark' | 'system') { return this.request<{ preferences: { theme: 'light' | 'dark' | 'system' } }>('/v1/preferences', { method: 'PUT', body: JSON.stringify({ theme }) }); }
  adminUsers() { return this.request<{ items: Array<ApiUser & { active: boolean; created_at: string; updated_at: string }> }>('/v1/admin/users'); }
  adminAcademicStructure() { return this.request<{ sections: Array<{ id: string; name: string; display_order: number; active: boolean }>; grades: Array<{ id: string; section_id: string; name: string; display_order: number; active: boolean }>; courses: Array<{ id: string; grade_id: string; name: string; display_order: number; active: boolean }>; }>('/v1/admin/academic/structure'); }
  createAcademicSection(input: { name: string; displayOrder: number }) { return this.request<{ section: unknown }>('/v1/admin/academic/sections', { method: 'POST', body: JSON.stringify(input) }); }
  updateAcademicSection(id: string, input: { name: string; displayOrder: number; active: boolean }) { return this.request<{ section: unknown }>('/v1/admin/academic/sections/' + id, { method: 'PATCH', body: JSON.stringify(input) }); }
  deleteAcademicSection(id: string) { return this.request<void>('/v1/admin/academic/sections/' + id, { method: 'DELETE' }); }
  createAcademicGrade(input: { sectionId: string; name: string; displayOrder: number }) { return this.request<{ grade: unknown }>('/v1/admin/academic/grades', { method: 'POST', body: JSON.stringify(input) }); }
  updateAcademicGrade(id: string, input: { sectionId: string; name: string; displayOrder: number; active: boolean }) { return this.request<{ grade: unknown }>('/v1/admin/academic/grades/' + id, { method: 'PATCH', body: JSON.stringify(input) }); }
  deleteAcademicGrade(id: string) { return this.request<void>('/v1/admin/academic/grades/' + id, { method: 'DELETE' }); }
  createAcademicCourse(input: { gradeId: string; name: string; displayOrder: number }) { return this.request<{ course: unknown }>('/v1/admin/academic/courses', { method: 'POST', body: JSON.stringify(input) }); }
  updateAcademicCourse(id: string, input: { gradeId: string; name: string; displayOrder: number; active: boolean }) { return this.request<{ course: unknown }>('/v1/admin/academic/courses/' + id, { method: 'PATCH', body: JSON.stringify(input) }); }
  deleteAcademicCourse(id: string) { return this.request<void>('/v1/admin/academic/courses/' + id, { method: 'DELETE' }); }
  adminRecessSchedules() { return this.request<{ sections: Array<{ id: string; name: string; display_order: number }>; grades: Array<{ id: string; section_id: string; name: string; display_order: number }>; courses: Array<{ id: string; grade_id: string; name: string; display_order: number }>; schedules: Array<{ id: string; name: string; weekday: number; start_time: string; end_time: string; active: boolean; priority: number; notes: string | null; created_at: string; updated_at: string }>; targets: Array<{ id: string; recess_schedule_id: string; section_id: string | null; grade_id: string | null; course_id: string | null }>; }>('/v1/admin/recess-schedules'); }
  createRecessSchedule(input: { name: string; weekday: number; startTime: string; endTime: string; scope: 'section' | 'grade' | 'course'; sectionId?: string; gradeId?: string; courseId?: string; notes?: string | null }) { return this.request<{ schedule: { id: string } }>('/v1/admin/recess-schedules', { method: 'POST', body: JSON.stringify(input) }); }
  updateRecessSchedule(id: string, input: { name: string; weekday: number; startTime: string; endTime: string; notes?: string | null }) { return this.request<{ schedule: unknown }>('/v1/admin/recess-schedules/' + id, { method: 'PATCH', body: JSON.stringify(input) }); }
  toggleRecessSchedule(id: string) { return this.request<{ schedule: { id: string; active: boolean } }>('/v1/admin/recess-schedules/' + id, { method: 'PATCH', body: JSON.stringify({ action: 'toggle' }) }); }
  recessStatus() { return this.request<{ allowed: boolean; reason: string; schedule: { id: string; name: string; start_time: string; end_time: string } | null }>('/v1/recess/status'); }
  deleteRecessSchedule(id: string) { return this.request<void>('/v1/admin/recess-schedules/' + id, { method: 'DELETE' }); }

  updateOrderStatus(orderId: string, status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled') { return this.request<{ order: ApiOrder }>('/v1/orders/' + orderId, { method: 'PATCH', body: JSON.stringify({ status }) }); }
  familyChildren() { return this.request<{ items: Array<{ id: string; email: string; full_name: string; status: string; created_at: string; section: string | null; grade: string | null; course: string | null }> }>('/v1/family/children'); }
  updateAdminUser(input: { id: string; email: string; fullName: string; role?: ApiRole; password?: string }) { return this.request<{ user: ApiUser }>('/v1/admin/users/' + input.id, { method: 'PATCH', body: JSON.stringify(input) }); }
  createInternalUser(input: { email: string; fullName: string; role: 'staff' | 'admin'; password: string }) { return this.request<{ user: ApiUser }>('/v1/admin/users', { method: 'POST', body: JSON.stringify(input) }); }
  updateProtectedCredentials(input: { id: string; email: string; password?: string }) { return this.request<{ user: { id: string; email: string } }>('/v1/admin/users/' + input.id + '/protected-credentials', { method: 'POST', body: JSON.stringify(input) }); }
  studentAccount() { return this.request<{ user: ApiUser; profilePreferences: { dietary_preferences?: string[]; allergies?: string | null; guardian_notes?: string | null }; consent: unknown; theme: string }>('/v1/student/account'); }
  updateStudentAccount(input: { fullName?: string; dietaryPreferences?: string[]; allergies?: string | null; guardianNotes?: string | null }) { return this.request<{ user: ApiUser }>('/v1/student/account', { method: 'PATCH', body: JSON.stringify(input) }); }
  studentLinkCode(forceNew = false) { return this.request<{ code: string; expires_at: string }>('/v1/student/link-code' + (forceNew ? '' : ''), { method: forceNew ? 'POST' : 'GET', body: forceNew ? '{}' : undefined }); }
  studentFavorites() { return this.request<{ items: Array<{ id: string; product_id?: string; name: string; description: string | null; price: number; stock: number; image_url?: string | null; available?: boolean; category_name?: string | null; category_id?: string | null }> }>('/v1/student/favorites'); }
  studentReviews() { return this.request<{ reviews: any[]; purchases: any[] }>('/v1/student/reviews'); }
  submitReview(input: { orderId: string; productId: string; stars: number; comment?: string }) { return this.request<{ review: any }>('/v1/student/reviews', { method: 'POST', body: JSON.stringify(input) }); }
  studentRewards() { return this.request<{ enabled: boolean; availablePoints: number; rewards: any[]; redemptions: any[] }>('/v1/student/rewards'); }
  redeemReward(rewardId: string) { return this.request<{ redemption: any }>('/v1/student/rewards/' + rewardId + '/redeem', { method: 'POST' }); }
  walletDetails() { return this.request<{ balance: number; transactions: any[]; topups: any[] }>('/v1/wallet/details'); }
  requestWalletTopup(input: { amount: number; method: 'manual' | 'nequi' | 'bre-b'; reference?: string; comment?: string }) { return this.request<{ request: any }>('/v1/wallet/topups', { method: 'POST', body: JSON.stringify(input) }); }
  parentFamily() { return this.request<{ items: any[] }>('/v1/parent/family'); }
  linkParentFamily(code: string) { return this.request<{ status: string }>('/v1/parent/family/link', { method: 'POST', body: JSON.stringify({ code }) }); }
  parentFoodControls(studentId: string) { return this.request<{ items: any[] }>('/v1/parent/food-controls?studentId=' + encodeURIComponent(studentId)); }
  setParentFoodBlock(input: { studentId: string; productId: string; blocked: boolean; reason?: string }) { return this.request<{ blocked: boolean }>('/v1/parent/food-controls', { method: 'PUT', body: JSON.stringify(input) }); }
  parentWellbeing(studentId: string) { return this.request<{ limits: any; spending: any; nutrition: any[] }>('/v1/parent/wellbeing?studentId=' + encodeURIComponent(studentId)); }
  setParentSpendingLimits(input: { studentId: string; dailyLimit?: number | null; weeklyLimit?: number | null; monthlyLimit?: number | null }) { return this.request<{ limits: any }>('/v1/parent/wellbeing', { method: 'PUT', body: JSON.stringify(input) }); }
  adminProducts() { return this.request<{ products: any[]; categories: any[] }>('/v1/admin/products'); }
  createProduct(input: { name: string; description?: string; price: number; categoryId?: string | null; imageUrl?: string | null; stock?: number }) { return this.request<{ product: any }>('/v1/admin/products', { method: 'POST', body: JSON.stringify(input) }); }
  updateProduct(id: string, input: any) { return this.request<{ product: any }>('/v1/admin/products/' + id, { method: 'PATCH', body: JSON.stringify(input) }); }
  deleteProduct(id: string) { return this.request<{ status: string }>('/v1/admin/products/' + id, { method: 'DELETE' }); }
  inventoryMovements() { return this.request<{ items: any[] }>('/v1/admin/inventory/movements'); }
  adjustInventory(input: { productId: string; newStock: number; reason: string }) { return this.request<{ stock: number }>('/v1/admin/inventory/adjust', { method: 'POST', body: JSON.stringify(input) }); }
  nutrition() { return this.request<{ items: any[] }>('/v1/admin/nutrition'); }
  saveNutrition(input: any) { return this.request<{ item: any }>('/v1/admin/nutrition', { method: 'PUT', body: JSON.stringify(input) }); }
  adminReviews() { return this.request<{ items: any[] }>('/v1/admin/reviews'); }
  moderateReview(id: string, status: 'approved' | 'rejected' | 'pending') { return this.request<{ status: string }>('/v1/admin/reviews/' + id, { method: 'POST', body: JSON.stringify({ status }) }); }
  adminLoyalty() { return this.request<{ settings: any; rewards: any[]; redemptions: any[] }>('/v1/admin/loyalty'); }
  setLoyaltyEnabled(enabled: boolean) { return this.request<{ settings: any }>('/v1/admin/loyalty/settings', { method: 'PUT', body: JSON.stringify({ enabled }) }); }
  moderatePayment(orderId: string, action: 'approve' | 'reject') { return this.request<{ order: ApiOrder }>('/v1/admin/orders/' + orderId + '/payment', { method: 'POST', body: JSON.stringify({ action }) }); }
  adminWalletTopups() { return this.request<{ items: any[] }>('/v1/admin/wallet/topups'); }
  moderateWalletTopup(id: string, action: 'approve' | 'reject', reason?: string) { return this.request<{ status: string }>('/v1/admin/wallet/topups/' + id, { method: 'POST', body: JSON.stringify({ action, reason }) }); }
  adminCancellations() { return this.request<{ items: any[] }>('/v1/admin/cancellations'); }
  reviewCancellation(id: string, approve: boolean, note?: string) { return this.request<{ status: string }>('/v1/admin/cancellations/' + id, { method: 'POST', body: JSON.stringify({ approve, note }) }); }
  adminDashboard(days = 30) { return this.request<{ period_days: number; daily: any[] }>('/v1/admin/dashboard?days=' + days); }
  adminReports(start: string, end: string) { return this.request<{ items: ApiOrder[] }>('/v1/admin/reports?start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end)); }
  adminHistory() { return this.request<{ audits: any[]; cancellations: any[] }>('/v1/admin/history'); }
  adminSystem() { return this.request<{ health: any[]; audit_events: number; open_alerts: number }>('/v1/admin/system'); }
  archiveOrders(ids: string[]) { return this.request<{ count: number }>('/v1/admin/orders/archive', { method: 'POST', body: JSON.stringify({ ids }) }); }
  deleteOrder(orderId: string) { return this.request<{ status: string }>('/v1/admin/orders/' + orderId, { method: 'DELETE' }); }
  resetPeriod(confirmation: string) { return this.request<{ status: string }>('/v1/admin/reset', { method: 'POST', body: JSON.stringify({ confirmation }) }); }
  orderWindows(){return this.request<{enabled:boolean;items:any[]}>('/v1/order-windows/status');}
  adminOrderWindows(){return this.request<{settings:any;items:any[]}>('/v1/admin/order-windows');}
  setAdminOrderWindowsEnabled(enabled:boolean){return this.request<{settings:any}>('/v1/admin/order-windows/settings',{method:'PUT',body:JSON.stringify({enabled})});}
  createOrderWindow(input:any){return this.request<{item:any}>('/v1/admin/order-windows',{method:'POST',body:JSON.stringify(input)});}
  updateOrderWindow(id:string,input:any){return this.request<{item:any}>('/v1/admin/order-windows/'+id,{method:'PATCH',body:JSON.stringify(input)});}
  deleteOrderWindow(id:string){return this.request<{status:string}>('/v1/admin/order-windows/'+id,{method:'DELETE'});}
  requestCancellation(input:{orderId:string;orderItemId?:string;quantity?:number;reason:string}){return this.request<{request:any}>('/v1/orders/cancel-request',{method:'POST',body:JSON.stringify(input)});}
  verifyPublicOrder(code: string) { return this.request<{ order: ApiOrder }>('/v1/order/verify?code=' + encodeURIComponent(code), {}, false); }
  verifyPickup(code: string) { return this.request<{ valid: boolean; alreadyDelivered?: boolean; order?: ApiOrder }>('/v1/staff/pickup/verify', { method: 'POST', body: JSON.stringify({ code }) }); }
  createOrder(items: Array<{ productId: string; quantity: number }>, paymentMethod: string, idempotencyKey: string, beneficiaryUserId?: string, comment?: string) {
    return this.request<{ order: ApiOrder }>('/v1/orders', { method: 'POST', body: JSON.stringify({ items: items.map(({ productId, quantity }) => ({ product_id: productId, quantity })), paymentMethod, idempotencyKey, beneficiaryUserId, comment }) });
  }
}

export function quickbiteApi(baseUrl = import.meta.env.VITE_API_BASE_URL) {
  const productionBaseUrl = typeof window !== 'undefined' && import.meta.env.PROD
    ? window.location.origin
    : baseUrl;

  if (!productionBaseUrl) throw new Error('VITE_API_BASE_URL is required for QuickBite Core API in local development');
  return new QuickBiteApi(productionBaseUrl.replace(/\/$/, ''));
}
