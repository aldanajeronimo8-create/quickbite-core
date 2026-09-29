import { create } from 'zustand';
import type { Profile } from '../types/domain';
import { writeAuditLog } from '../lib/auditLog';
import { quickbiteApi, type ApiSession } from '../services/api/quickbiteApi';
import { signInWithFirebaseGoogle, signOutFirebase } from '../services/firebaseAuth';

const ACTIVE_STUDENT_STORAGE_KEY = 'quickbite.parent.activeStudent';

function clearDelegatedStudentContext() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(ACTIVE_STUDENT_STORAGE_KEY);
  window.localStorage.removeItem(ACTIVE_STUDENT_STORAGE_KEY);
}

function profileFromSession(session: ApiSession): Profile {
  return {
    id: session.user.id,
    email: session.user.email,
    full_name: session.user.fullName,
    role: session.user.role,
    roles: session.user.roles,
    protected: session.user.protected,
    section: session.user.section ?? null,
    grade: session.user.grade ?? null,
    course: session.user.course ?? null,
    section_id: session.user.sectionId ?? null,
    grade_id: session.user.gradeId ?? null,
    course_id: session.user.courseId ?? null,
    created_at: new Date().toISOString(),
  };
}

function api() { return quickbiteApi(); }

interface AuthState {
  user: Profile | null;
  session: { token: string } | null;
  loading: boolean;
  setUser: (user: Profile | null) => void;
  signIn: (email: string, password: string, role?: 'student' | 'parent' | 'staff' | 'admin') => Promise<void>;
  signInWithFirebaseGoogle: () => Promise<{ status: 'authenticated'; user: Profile } | { status: 'onboarding_required'; email: string; fullName: string }>;
  switchRole: (role: 'student' | 'parent' | 'staff' | 'admin') => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, inviteCode: string) => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),

  signIn: async (email, password, role) => {
    clearDelegatedStudentContext();
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const session = await api().login(normalizedEmail, password, role);
      const profile = profileFromSession(session);
      writeAuditLog({ action: 'auth.login', actorId: profile.id, actorEmail: profile.email });
      set({ user: profile, session: { token: session.accessToken }, loading: false });
    } catch (error) {
      writeAuditLog({ action: 'auth.error', actorEmail: normalizedEmail, metadata: { reason: String(error) } });
      throw error instanceof Error ? error : new Error('No se pudo iniciar sesión.');
    }
  },

  signInWithFirebaseGoogle: async () => {
    clearDelegatedStudentContext();
    try {
      const identity = await signInWithFirebaseGoogle();
      const result = await api().exchangeFirebaseToken(identity.idToken);
      if (result.status === 'onboarding_required') return result;
      const profile = profileFromSession(result.session);
      writeAuditLog({ action: 'auth.login.google', actorId: profile.id, actorEmail: profile.email, metadata: { provider: 'firebase/google' } });
      set({ user: profile, session: { token: result.session.accessToken }, loading: false });
      return { status: 'authenticated', user: profile };
    } catch (error) {
      await signOutFirebase().catch(() => undefined);
      throw error instanceof Error ? error : new Error('No se pudo iniciar sesión con Google.');
    }
  },

  switchRole: async (role) => {
    try {
      const session = await api().switchRole(role);
      const profile = profileFromSession(session);
      set({ user: profile, session: { token: session.accessToken }, loading: false });
    } catch (error) {
      throw error instanceof Error ? error : new Error('No se pudo cambiar de entorno.');
    }
  },

  signUp: async () => {
    throw new Error('El registro de administradores se habilitará mediante el endpoint seguro de administración de QuickBite Core.');
  },

  signOut: async () => {
    clearDelegatedStudentContext();
    const current = useAuthStore.getState().user;
    if (current) writeAuditLog({ action: 'auth.logout', actorId: current.id, actorEmail: current.email });
    await api().logout().catch(() => undefined);
    set({ user: null, session: null, loading: false });
  },

  checkSession: async () => {
    try {
      const client = api();
      if (!client.getSession()) {
        set({ loading: false, user: null, session: null });
        return;
      }
      const { user } = await client.me();
      const profile = profileFromSession({
        accessToken: client.getSession()!.accessToken,
        user,
      });
      set({ user: profile, session: { token: client.getSession()!.accessToken }, loading: false });
    } catch {
      api().setSession(null);
      set({ loading: false, user: null, session: null });
    }
  },
}));
