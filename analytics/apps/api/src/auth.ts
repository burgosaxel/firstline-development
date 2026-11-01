import type { OwnerIdentity } from '@firstline/contracts';
import { OWNER_EMAIL, type RuntimeConfig } from './config.js';
import { grantedSiteIds } from './registry.js';

export interface VerifiedToken { uid: string; email?: string; email_verified?: boolean; aud?: string; firebase?: { sign_in_provider?: string }; }
export type TokenVerifier = (token: string) => Promise<VerifiedToken>;

export function authorizeVerifiedToken(token: VerifiedToken, config: RuntimeConfig): OwnerIdentity {
  if (!config.firebaseProjectId) throw Object.assign(new Error('authentication is unconfigured'), { status: 503, code: 'unconfigured' });
  if (token.aud !== config.firebaseProjectId || token.email !== OWNER_EMAIL || !token.email_verified || token.firebase?.sign_in_provider !== 'google.com') throw Object.assign(new Error('owner access denied'), { status: 403, code: 'forbidden' });
  return { uid: token.uid, email: OWNER_EMAIL, authorizedSiteIds: grantedSiteIds(OWNER_EMAIL) };
}

export async function firebaseVerifier(token: string): Promise<VerifiedToken> {
  const projectId = process.env.FIRSTLINE_FIREBASE_PROJECT_ID;
  if (!projectId) throw Object.assign(new Error('authentication is unconfigured'), { status: 503, code: 'unconfigured' });
  try {
    const [{ getApps, initializeApp }, { getAuth }] = await Promise.all([import('firebase-admin/app'), import('firebase-admin/auth')]);
    const app = getApps().find((candidate) => candidate.options.projectId === projectId) ?? initializeApp({ projectId }, `firstline-${projectId}`);
    return await getAuth(app).verifyIdToken(token, true);
  } catch (cause) {
    const error = cause as { code?: string };
    if (error.code?.startsWith('auth/')) throw Object.assign(new Error('invalid identity'), { status: 401, code: 'unauthenticated' });
    throw Object.assign(new Error('authentication is unavailable'), { status: 503, code: 'authentication_unavailable' });
  }
}
