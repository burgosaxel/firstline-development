import test from 'node:test';
import assert from 'node:assert/strict';
import { firebaseOwnerSession, isFirebaseWebConfigured, loadFirebaseWebConfig, ownerSession } from '../../apps/web/src/firebase-auth.ts';
import { RequestEpoch, clearedPortalState, describePortalError } from '../../apps/web/src/portal-state.ts';

test('portal error states are distinct and truthful', () => {
  assert.equal(describePortalError('forbidden').title, 'Owner access denied');
  assert.equal(describePortalError('unconfigured').title, 'Analytics is not configured');
  assert.equal(describePortalError('quota').title, 'Analytics quota reached');
  assert.equal(describePortalError('provider_error').title, 'Analytics provider error');
  assert.equal(describePortalError('invalid_request').title, 'Invalid report request');
  assert.equal(describePortalError('no_data').title, 'No analytics data for this range');
  assert.equal(describePortalError('unknown').title, 'Request unavailable');
});

test('Firebase sign-in readiness requires every public web configuration value', () => {
  assert.equal(isFirebaseWebConfigured({ apiKey: 'key', authDomain: 'example.firebaseapp.com', projectId: 'project', appId: 'app' }), true);
  assert.equal(isFirebaseWebConfigured({ apiKey: 'key', authDomain: 'example.firebaseapp.com', projectId: 'project' }), false);
  assert.equal(isFirebaseWebConfigured({}), false);
});

test('Firebase web configuration loads only from the same-origin public bootstrap route', async () => {
  const config = await loadFirebaseWebConfig(async (input) => {
    assert.equal(input, '/api/config');
    return new Response(JSON.stringify({ firebase: { apiKey: 'key', authDomain: 'example.firebaseapp.com', projectId: 'project', appId: 'app' } }));
  });
  assert.equal(config.projectId, 'project');
  await assert.rejects(() => loadFirebaseWebConfig(async () => new Response(JSON.stringify({ error: 'unconfigured' }), { status: 503 })), /unconfigured/);
});

test('logout state clearing and request epochs prevent stale responses', () => {
  assert.deepEqual(clearedPortalState(), { sites: [], selected: '', portfolio: undefined, report: undefined, error: undefined });
  const epoch = new RequestEpoch();
  const older = epoch.begin();
  const newer = epoch.begin();
  assert.equal(older(), false);
  assert.equal(newer(), true);
  epoch.invalidate();
  assert.equal(newer(), false);
});

test('Firebase session lifecycle is observable and supplies cleanup', async () => {
  let listener: ((identity: string | undefined) => void) | undefined;
  let cleaned = false;
  const session = ownerSession({ token: async () => 'test-token', signOut: async () => undefined, identity: () => 'owner', observe: (next) => { listener = next; return () => { cleaned = true; }; } });
  const seen: Array<string | undefined> = [];
  const stop = session.observe((active) => seen.push(active));
  listener?.('owner'); listener?.(undefined); stop();
  assert.deepEqual(seen, ['owner', undefined]);
  assert.equal(cleaned, true);
  assert.equal(await session.token(), 'test-token');
});

test('Firebase observer replaces the token source when the signed-in user changes', async () => {
  let listener: ((user: { uid: string; getIdToken(): Promise<string> } | null) => void) | undefined;
  let cleaned = false;
  const first = { uid: 'first', getIdToken: async () => 'first-token' };
  const second = { uid: 'second', getIdToken: async () => 'second-token' };
  const session = firebaseOwnerSession({ signOut: async () => undefined }, first, (next) => { listener = next; return () => { cleaned = true; }; });
  const identities: Array<string | undefined> = [];
  const stop = session.observe((identity) => identities.push(identity));
  listener?.(second);
  assert.equal(session.identity(), 'second');
  assert.equal(await session.token(), 'second-token');
  listener?.(null); stop();
  assert.deepEqual(identities, ['second', undefined]);
  assert.equal(cleaned, true);
});
