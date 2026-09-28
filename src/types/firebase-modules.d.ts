declare module 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js' {
  export function getApps(): unknown[];
  export function initializeApp(config: Record<string, string>): unknown;
}

declare module 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js' {
  export const browserSessionPersistence: unknown;
  export const browserPopupRedirectResolver: unknown;
  export function getAuth(app: unknown): unknown;
  export function initializeAuth(app: unknown, options: Record<string, unknown>): unknown;
  export class GoogleAuthProvider {
    setCustomParameters(params: Record<string, string>): void;
  }
  export function signInWithPopup(auth: unknown, provider: unknown): Promise<{
    user: {
      uid: string;
      email: string | null;
      displayName: string | null;
      getIdToken(forceRefresh?: boolean): Promise<string>;
    };
  }>;
  export function signOut(auth: unknown): Promise<void>;
}
