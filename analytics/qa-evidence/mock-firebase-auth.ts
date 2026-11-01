import type { BrowserOwnerSession, FirebaseWebConfig } from '../apps/web/src/firebase-auth.ts';

const localSession: BrowserOwnerSession = {
  token: async () => 'local-browser-mock-owner',
  signOut: async () => undefined,
  identity: () => 'local-browser-mock-owner',
  observe: () => () => undefined
};

export function isFirebaseWebConfigured(config: FirebaseWebConfig): config is Required<FirebaseWebConfig> {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export async function loadFirebaseWebConfig(): Promise<Required<FirebaseWebConfig>> {
  return { apiKey: 'local-browser-mock', authDomain: 'localhost', projectId: 'local-browser-mock', appId: 'local-browser-mock' };
}

export async function signInWithGoogle(): Promise<BrowserOwnerSession> {
  return localSession;
}
