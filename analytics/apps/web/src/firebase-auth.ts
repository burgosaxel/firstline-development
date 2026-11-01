export interface BrowserOwnerSession {
  token(): Promise<string>;
  signOut(): Promise<void>;
  identity(): string | undefined;
  observe(listener: (identity: string | undefined) => void): () => void;
}

export interface FirebaseWebConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  appId?: string;
}

export function isFirebaseWebConfigured(config: FirebaseWebConfig): config is Required<FirebaseWebConfig> {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export async function loadFirebaseWebConfig(request: typeof fetch = fetch): Promise<Required<FirebaseWebConfig>> {
  const response = await request('/api/config');
  const body: unknown = await response.json();
  const config = typeof body === 'object' && body !== null && 'firebase' in body ? (body as { firebase: FirebaseWebConfig }).firebase : {};
  if (!response.ok || !isFirebaseWebConfigured(config)) throw new Error('Firebase sign-in is unconfigured.');
  return config;
}

export function ownerSession(gateway: BrowserOwnerSession): BrowserOwnerSession { return gateway; }

interface FirebaseUserLike { uid: string; getIdToken(): Promise<string>; }
interface FirebaseAuthLike { signOut(): Promise<void>; }

export function firebaseOwnerSession(
  auth: FirebaseAuthLike,
  initialUser: FirebaseUserLike,
  subscribe: (listener: (user: FirebaseUserLike | null) => void) => () => void
): BrowserOwnerSession {
  let currentUser: FirebaseUserLike | undefined = initialUser;
  return ownerSession({
    token: async () => {
      if (!currentUser) throw new Error('Firebase session is unavailable.');
      return currentUser.getIdToken();
    },
    signOut: () => auth.signOut(),
    identity: () => currentUser?.uid,
    observe: (listener) => subscribe((user) => { currentUser = user ?? undefined; listener(currentUser?.uid); })
  });
}

export async function signInWithGoogle(config: FirebaseWebConfig): Promise<BrowserOwnerSession> {
  if (!isFirebaseWebConfigured(config)) throw new Error('Firebase sign-in is unconfigured.');
  const { initializeApp, getApps } = await import('firebase/app');
  const { GoogleAuthProvider, getAuth, inMemoryPersistence, onIdTokenChanged, setPersistence, signInWithPopup } = await import('firebase/auth');
  const app = getApps()[0] ?? initializeApp(config); const auth = getAuth(app); await setPersistence(auth, inMemoryPersistence); const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return firebaseOwnerSession(auth, result.user, (listener) => onIdTokenChanged(auth, listener));
}
