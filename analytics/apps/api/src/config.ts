import type { PortalMode } from '@firstline/contracts';

export const OWNER_EMAIL = 'firstlinedevnt@gmail.com';

export interface RuntimeConfig {
  mode: PortalMode;
  externalAccess: boolean;
  ga4Mode: 'disabled' | 'live';
  firebaseProjectId?: string;
  firebaseWebConfig?: FirebaseWebConfig;
}

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

function firebaseWebConfig(env: NodeJS.ProcessEnv): FirebaseWebConfig | undefined {
  const { FIRSTLINE_FIREBASE_WEB_API_KEY: apiKey, FIRSTLINE_FIREBASE_WEB_AUTH_DOMAIN: authDomain, FIRSTLINE_FIREBASE_WEB_PROJECT_ID: projectId, FIRSTLINE_FIREBASE_WEB_APP_ID: appId } = env;
  return apiKey && authDomain && projectId && appId ? { apiKey, authDomain, projectId, appId } : undefined;
}

export function runtimeConfig(env = process.env): RuntimeConfig {
  const mode = env.FIRSTLINE_MODE === 'demo' ? 'demo' : 'production';
  const externalAccess = env.FIRSTLINE_EXTERNAL_ACCESS === 'true';
  const ga4Mode = env.FIRSTLINE_GA4_MODE === 'live' ? 'live' : 'disabled';
  if (mode === 'demo' && env.NODE_ENV === 'production') throw new Error('demo mode is not permitted in production');
  if (env.FIREBASE_AUTH_EMULATOR_HOST || env.FIRESTORE_EMULATOR_HOST) throw new Error('Firebase emulators are not permitted by this composition');
  return { mode, externalAccess, ga4Mode, firebaseProjectId: env.FIRSTLINE_FIREBASE_PROJECT_ID, firebaseWebConfig: firebaseWebConfig(env) };
}

export function assertLocalDemoComposition(config: RuntimeConfig, host?: string) {
  if (config.mode !== 'demo') return;
  if (host && host !== '127.0.0.1' && host !== '::1' && host !== 'localhost') throw new Error('demo mode may bind only to loopback');
}

export function assertFunctionsComposition(config: RuntimeConfig) {
  if (config.mode === 'demo') throw new Error('demo mode is not permitted in Firebase Functions');
}
