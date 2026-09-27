import { create } from 'zustand';
import { requireSupabaseClient, type Profile } from '../lib/supabase';
import { apiLogin, apiLogout, getStoredAuthSession, getValidAccessToken } from '../services/quickbiteAuth';
import { writeAuditLog } from '../lib/auditLog';
import { getProfile } from '../repositories/quickbiteRepository';

const ACTIVE_STUDENT_STORAGE_KEY = 'quickbite.parent.activeStudent';

function clearDelegatedStudentContext() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(ACTIVE_STUDENT_STORAGE_KEY);
  window.localStorage.removeItem(ACTIVE_STUDENT_STORAGE_KEY);
}

interface AuthState {
  user: Profile | null;
  session: { token: string } | null;
  loading: boolean;
  setUser: (user: Profile | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, inviteCode: string) => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),

  signIn: async (email, password) => {
    clearDelegatedStudentContext();
    const normalizedEmail = email.trim().toLowerCase();
    let apiSession;
    try { apiSession = await apiLogin(normalizedEmail, password); }
    catch (error) {
      writeAuditLog({ action: 'auth.error', actorEmail: normalizedEmail, metadata: { reason: error instanceof Error ? error.message : 'api_login_failed' } });
      throw new Error('Correo o contraseña incorrectos.');
    }
    const apiUser = apiSession.user;
    const profile: Profile = {
      id: apiUser.id, email: apiUser.email, full_name: apiUser.full_name ?? apiUser.email,
      role: apiUser.role as Profile['role'], ti: null, created_at: new Date().toISOString(),
      section_id: apiUser.section_id, grade_id: apiUser.grade_id, course_id: apiUser.course_id,
    };
    if (!profile) { await apiLogout(); throw new Error('No se pudo cargar tu perfil de QuickBite.'); }
    writeAuditLog({ action: 'auth.login', actorId: profile.id, actorEmail: profile.email });
    set({ user: profile, session: { token: apiSession.accessToken }, loading: false });
  },

  signUp: async (email, password, fullName, inviteCode) => {
    clearDelegatedStudentContext();
    const supabase = requireSupabaseClient();
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password, options: { data: { full_name: fullName.trim(), role: 'admin' } } });
    if (error) {
      writeAuditLog({ action: 'auth.error', actorEmail: normalizedEmail, metadata: { reason: error.message } });
      throw new Error(error.message);
    }
    const userId = data.user?.id;
    if (!userId) throw new Error('No se pudo obtener el ID del usuario.');
    const { error: rpcError } = await supabase.rpc('create_admin_profile', { p_user_id: userId, p_email: normalizedEmail, p_full_name: fullName.trim(), p_invite_code: inviteCode });
    if (rpcError) {
      writeAuditLog({ action: 'auth.error', actorEmail: normalizedEmail, metadata: { reason: rpcError.message } });
      throw new Error('Error al crear el perfil: ' + rpcError.message);
    }
    if (!data.session) {
      writeAuditLog({ action: 'auth.signup', actorId: userId, actorEmail: normalizedEmail, metadata: { role: 'admin', pending_confirmation: true } });
      throw new Error('CONFIRM_EMAIL');
    }
    const profile = await getProfile(userId);
    writeAuditLog({ action: 'auth.signup', actorId: userId, actorEmail: normalizedEmail, metadata: { role: 'admin' } });
    set({ user: profile, session: profile ? { token: data.session.access_token } : null, loading: false });
  },

  signOut: async () => {
    clearDelegatedStudentContext();
    const profile = useAuthStore.getState().user;
    if (profile) writeAuditLog({ action: 'auth.logout', actorId: profile.id, actorEmail: profile.email });
    await apiLogout();
    set({ user: null, session: null, loading: false });
  },

  checkSession: async () => {
    try {
      const stored = getStoredAuthSession();
      const token = await getValidAccessToken();
      if (!stored || !token) { set({ loading: false, user: null, session: null }); return; }
      const profile: Profile = {
        id: stored.user.id, email: stored.user.email, full_name: stored.user.full_name ?? stored.user.email,
        role: stored.user.role as Profile['role'], ti: null, created_at: new Date().toISOString(),
        section_id: stored.user.section_id, grade_id: stored.user.grade_id, course_id: stored.user.course_id,
      };
      set({ user: profile, session: { token }, loading: false });
    } catch {
      set({ loading: false, user: null, session: null });
    }
  },
}));
