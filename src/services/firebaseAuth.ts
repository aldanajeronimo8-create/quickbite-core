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

// Firebase Web config is public application configuration, not a password.
// Keep env overrides for deployments, with the project's generated config as a safe fallback.
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || 'AIzaSyCsFFs8_5LGNCyQo_3tqblRZlPvysFOXwg',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || 'quickbite-daf31.firebaseapp.com',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || 'quickbite-daf31',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) || 'quickbite-daf31.firebasestorage.app',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) || '678157251455',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) || '1:678157251455:web:f6803ebfe250998351604a',
};

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

  const result = await modules.signInWithPopup(auth, provider);

  return {
    uid: result.user.uid,
    email: result.user.email?.trim().toLowerCase() ?? '',
    fullName: result.user.displayName ?? '',
    idToken: await result.user.getIdToken(true),
  };
}

export async function signOutFirebase() {
  if (!firebaseAuth) return;
  const modules = await loadFirebaseModules();
  await modules.auth.signOut(firebaseAuth);
}
