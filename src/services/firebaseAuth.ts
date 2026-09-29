type FirebaseAppModule = {
  getApps: () => unknown[];
  initializeApp: (config: Record<string, string>) => unknown;
};

type FirebaseAuthModule = {
  browserSessionPersistence: unknown;
  browserPopupRedirectResolver: unknown;
  getAuth: (app: unknown) => unknown;
  initializeAuth: (app: unknown, options: Record<string, unknown>) => unknown;
  GoogleAuthProvider: new () => { setCustomParameters: (params: Record<string, string>) => void };
  signInWithPopup: (
    auth: unknown,
    provider: unknown,
  ) => Promise<{
    user: {
      uid: string;
      email: string | null;
      displayName: string | null;
      getIdToken: (forceRefresh?: boolean) => Promise<string>;
    };
  }>;
  signOut: (auth: unknown) => Promise<void>;
};

const enabled = import.meta.env.VITE_FIREBASE_AUTH_ENABLED !== 'false';

// Firebase Web configuration must come from deployment environment variables.
// Never commit Firebase API keys or other project configuration into source control.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ?? (import.meta.env.VITE_FIREBASE_PROJECT_ID ? `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com` : undefined),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export function getFirebaseGoogleConfig() {
  return { ...firebaseConfig };
}

export function isFirebaseGoogleConfigured() {
  return enabled && Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
  );
}

let firebaseApp: unknown = null;
let firebaseAuth: unknown = null;
let firebaseModulesPromise: Promise<{
  app: FirebaseAppModule;
  auth: FirebaseAuthModule;
}> | null = null;

async function loadFirebaseModules() {
  firebaseModulesPromise ??= Promise.all([
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
  ]).then(([app, auth]) => ({
    app: app as unknown as FirebaseAppModule,
    auth: auth as unknown as FirebaseAuthModule,
  }));

  return firebaseModulesPromise;
}

async function getFirebaseAuth() {
  if (!isFirebaseGoogleConfigured()) throw new Error('firebase_not_configured');

  const modules = await loadFirebaseModules();

  if (!firebaseApp) {
    const existing = modules.app.getApps();
    firebaseApp = existing[0] ?? modules.app.initializeApp({
      apiKey: firebaseConfig.apiKey!,
      authDomain: firebaseConfig.authDomain!,
      projectId: firebaseConfig.projectId!,
      storageBucket: firebaseConfig.storageBucket ?? '',
      messagingSenderId: firebaseConfig.messagingSenderId ?? '',
      appId: firebaseConfig.appId!,
    });
  }

  if (!firebaseAuth) {
    try {
      firebaseAuth = modules.auth.initializeAuth(firebaseApp, {
        persistence: modules.auth.browserSessionPersistence,
        popupRedirectResolver: modules.auth.browserPopupRedirectResolver,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.toLowerCase().includes('already exists')) throw error;
      firebaseAuth = modules.auth.getAuth(firebaseApp);
    }
  }

  return {
    auth: firebaseAuth,
    modules: modules.auth,
  };
}

export async function signInWithFirebaseGoogle() {
  const { auth, modules } = await getFirebaseAuth();
  const provider = new modules.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await modules.signInWithPopup(auth, provider);

    return {
      uid: result.user.uid,
      email: result.user.email?.trim().toLowerCase() ?? '',
      fullName: result.user.displayName ?? '',
      idToken: await result.user.getIdToken(true),
    };
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
    if (code === 'auth/configuration-not-found') throw new Error('firebase_google_provider_not_configured');
    if (code === 'auth/unauthorized-domain') throw new Error('firebase_unauthorized_domain');
    throw error;
  }
}

export async function signOutFirebase() {
  if (!firebaseAuth) return;
  const modules = await loadFirebaseModules();
  await modules.auth.signOut(firebaseAuth);
}
