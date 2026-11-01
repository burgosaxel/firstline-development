import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/src/app.ts';
import { Ga4DomainError } from '../../apps/api/src/ga4.ts';
import { createRegistry, type RegisteredSite } from '../../apps/api/src/registry.ts';

const config = { mode: 'production' as const, externalAccess: false, ga4Mode: 'disabled' as const, firebaseProjectId: 'test-project' };
const verifier = async () => ({ uid: 'owner', aud: 'test-project', email: 'firstlinedevnt@gmail.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } });
const ownerHeaders = { Authorization: 'Bearer test' };
const first: RegisteredSite = { id: 'first', displayName: 'First', canonicalOrigin: 'https://first.example', status: 'active', capabilities: ['ga4-aggregate-overview'], ga4Enabled: true, ownerEmails: ['firstlinedevnt@gmail.com'], ga4: { accountId: '1', propertyId: '2', webStreamId: '3', measurementId: 'G-TEST1' } };
async function server(adapter: { getOverview: (site: RegisteredSite, range: { start: string; end: string }) => Promise<unknown> }, registry = createRegistry([first])) {
  const listener = createApp({ config, verifier, adapter: adapter as never, registry }).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => listener.once('listening', resolve));
  const port = (listener.address() as { port: number }).port;
  return { url: `http://127.0.0.1:${port}`, stop: () => new Promise<void>((resolve) => listener.close(() => resolve())) };
}

test('route validation and health security headers are truthful', async () => {
  const local = await server({ getOverview: async () => { throw new Error('not called'); } });
  try {
    const health = await fetch(`${local.url}/api/v1/health`);
    assert.match(health.headers.get('cache-control') ?? '', /private, no-store/);
    const invalid = await fetch(`${local.url}/api/v1/sites/first/ga4-overview?start=2026-02-30&end=2026-03-01`, { headers: ownerHeaders });
    assert.deepEqual({ status: invalid.status, body: await invalid.json() }, { status: 400, body: { error: 'invalid_request' } });
  } finally { await local.stop(); }
});

test('public Firebase bootstrap configuration is available only on the unversioned same-origin route', async () => {
  const webConfig = { apiKey: 'public-key', authDomain: 'test.firebaseapp.com', projectId: 'test-project', appId: 'test-app' };
  const listener = createApp({ config: { ...config, firebaseWebConfig: webConfig } }).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => listener.once('listening', resolve));
  const port = (listener.address() as { port: number }).port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/config`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await response.json(), { firebase: webConfig });
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/config`)).status, 401);
  } finally { await new Promise<void>((resolve) => listener.close(() => resolve())); }
});

test('portfolio preserves per-site provider failure codes without fabricated aggregate metrics', async () => {
  for (const failure of [['permission_denied', 403], ['quota', 429], ['disconnected', 503], ['provider_error', 503]] as const) {
    const local = await server({ getOverview: async () => { throw new Ga4DomainError(failure[0]); } });
    try {
      const report = await fetch(`${local.url}/api/v1/portfolio?start=2026-10-01&end=2026-10-01`, { headers: ownerHeaders });
      const body = await report.json();
      assert.equal(report.status, 200);
      assert.equal(body.aggregate, null);
      assert.equal(body.sites[0].status, failure[0]);
      const site = await fetch(`${local.url}/api/v1/sites/first/ga4-overview?start=2026-10-01&end=2026-10-01`, { headers: ownerHeaders });
      assert.equal(site.status, failure[1]);
      assert.deepEqual(await site.json(), { error: failure[0] });
    } finally { await local.stop(); }
  }
});

test('portfolio rejects browser-supplied provider selector fields before adapter work', async () => {
  let calls = 0;
  const local = await server({ getOverview: async () => { calls += 1; throw new Error('must not be called'); } });
  try {
    const response = await fetch(`${local.url}/api/v1/portfolio?start=2026-10-01&end=2026-10-01&propertyId=999`, { headers: ownerHeaders });
    assert.deepEqual({ status: response.status, body: await response.json() }, { status: 400, body: { error: 'invalid_request' } });
    assert.equal(calls, 0);
  } finally { await local.stop(); }
});

test('paused or malformed registry entries cannot invoke the adapter through an app route', async () => {
  const paused: RegisteredSite = { ...first, id: 'paused', canonicalOrigin: 'https://paused.example', ga4: { ...first.ga4, propertyId: '4', webStreamId: '5', measurementId: 'G-TEST2' }, status: 'paused' };
  let calls = 0;
  const local = await server({ getOverview: async () => { calls += 1; throw new Error('must not be called'); } }, createRegistry([first, paused]));
  try {
    const response = await fetch(`${local.url}/api/v1/sites/paused/ga4-overview?start=2026-10-01&end=2026-10-01`, { headers: ownerHeaders });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'unconfigured');
    assert.equal(calls, 0);
  } finally { await local.stop(); }
  assert.throws(() => createRegistry([{ ...first, canonicalOrigin: 'http://not-secure.example' }]));
  assert.throws(() => createRegistry([{ ...first, ownerEmails: ['not-an-email'] }]));
  assert.throws(() => createRegistry([{ ...first, timezone: 'Mars/Olympus' }]));
  for (const malformed of [
    { ...first, ga4Enabled: 'false' },
    { ...first, ga4: { ...first.ga4, accountId: 1 } },
    { ...first, ga4: { ...first.ga4, propertyId: null } },
    { ...first, ga4: { ...first.ga4, webStreamId: false } },
    { ...first, ga4: { ...first.ga4, measurementId: ['G-TEST1'] } },
  ]) {
    calls = 0;
    assert.throws(() => createApp({ config, verifier, adapter: { getOverview: async () => { calls += 1; throw new Error('must not be called'); } } as never, registry: { entries: [malformed] } as never }));
    assert.equal(calls, 0);
  }
});
