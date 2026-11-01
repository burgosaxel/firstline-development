import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeVerifiedToken } from '../../apps/api/src/auth.ts';
import { assertFunctionsComposition, assertLocalDemoComposition, runtimeConfig } from '../../apps/api/src/config.ts';
import { Ga4DomainError, LiveGa4Adapter } from '../../apps/api/src/ga4.ts';
import { isReportableSite, validateRegistry, type RegisteredSite } from '../../apps/api/src/registry.ts';

const config = { mode: 'production' as const, externalAccess: true, ga4Mode: 'live' as const, firebaseProjectId: 'test-project' };
const site: RegisteredSite = { id: 'test-site', displayName: 'Test', canonicalOrigin: 'https://test.example', status: 'active', capabilities: ['ga4-aggregate-overview'], ga4Enabled: true, ownerEmails: ['firstlinedevnt@gmail.com'], ga4: { accountId: '1', propertyId: '2', webStreamId: '3', measurementId: 'G-TEST1' } };

test('authorization requires the bound audience, verified exact owner and Google provider', () => {
  const valid = { uid: 'u', aud: 'test-project', email: 'firstlinedevnt@gmail.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } };
  assert.equal(authorizeVerifiedToken(valid, config).uid, 'u');
  for (const token of [{ ...valid, aud: 'wrong' }, { ...valid, email_verified: false }, { ...valid, firebase: { sign_in_provider: 'password' } }, { ...valid, email: 'other@example.com' }]) assert.throws(() => authorizeVerifiedToken(token, config), { code: 'forbidden' });
});

test('live adapter uses bounded fixed Data API reports and validates returned series without fixture fallback', async () => {
  let request: { url: string; init: RequestInit } | undefined;
  const adapter = new LiveGa4Adapter(async () => 'test-token', async (url, init) => { request = { url, init }; const body = JSON.parse(String(init.body)); if (!body.dimensions) return new Response(JSON.stringify({ rows: [{ metricValues: [{ value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }] }] }), { status: 200 }); const dimension = body.dimensions[0].name; const rows = dimension === 'date' ? [{ dimensionValues: [{ value: '20261001' }], metricValues: [{ value: '0' }, { value: '0' }] }] : dimension === 'pagePath' ? [{ dimensionValues: [{ value: '/' }], metricValues: [{ value: '0' }] }] : [{ dimensionValues: [{ value: 'page_view' }], metricValues: [{ value: '0' }] }]; return new Response(JSON.stringify({ rows }), { status: 200 }); });
  const report = await adapter.getOverview(site, { start: '2026-10-01', end: '2026-10-01' });
  assert.equal(request?.url, 'https://analyticsdata.googleapis.com/v1beta/properties/2:runReport');
  assert.equal(JSON.parse(String(request?.init.body)).dimensionFilter.filter.stringFilter.value, '3');
  assert.deepEqual(report.metrics, { users: 0, sessions: 0, views: 0, engagementRate: 0, eventCount: 0 });
  assert.deepEqual(report.daily, [{ date: '2026-10-01', sessions: 0, views: 0 }]);
});

test('live adapter maps empty, provider failures, malformed values, and data-loss notices truthfully', async () => {
  const responseAdapter = (response: Response) => new LiveGa4Adapter(async () => 'token', async (_url, init) => JSON.parse(String(init.body)).dimensions ? new Response(JSON.stringify({ rows: [] }), { status: 200 }) : response);
  assert.equal((await responseAdapter(new Response(JSON.stringify({ rows: [] }), { status: 200 })).getOverview(site, { start: '2026-10-01', end: '2026-10-01' })).status, 'no_data');
  await assert.rejects(() => responseAdapter(new Response('', { status: 401 })).getOverview(site, { start: '2026-10-01', end: '2026-10-01' }), (error: unknown) => error instanceof Ga4DomainError && error.code === 'disconnected');
  await assert.rejects(() => responseAdapter(new Response('', { status: 403 })).getOverview(site, { start: '2026-10-01', end: '2026-10-01' }), (error: unknown) => error instanceof Ga4DomainError && error.code === 'permission_denied');
  await assert.rejects(() => responseAdapter(new Response('', { status: 429 })).getOverview(site, { start: '2026-10-01', end: '2026-10-01' }), (error: unknown) => error instanceof Ga4DomainError && error.code === 'quota');
  for (const body of [{ rows: [{}] }, { rows: [{ metricValues: [{ value: '' }, { value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }] }] }, { rows: [{ metricValues: [{ value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }] }, { metricValues: [{ value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }] }] }]) await assert.rejects(() => responseAdapter(new Response(JSON.stringify(body), { status: 200 })).getOverview(site, { start: '2026-10-01', end: '2026-10-01' }), (error: unknown) => error instanceof Ga4DomainError && error.code === 'provider_error');
  const warned = await responseAdapter(new Response(JSON.stringify({ rows: [{ metricValues: [{ value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }, { value: '0' }] }], metadata: { dataLossFromOtherRow: true } }), { status: 200 })).getOverview(site, { start: '2026-10-01', end: '2026-10-01' });
  assert.match(warned.warning ?? '', /data loss/);
  for (const metadata of [{ timeZone: 'not-a-timezone' }, { dataLossFromOtherRow: 'true' }]) await assert.rejects(() => responseAdapter(new Response(JSON.stringify({ rows: [], metadata }), { status: 200 })).getOverview(site, { start: '2026-10-01', end: '2026-10-01' }), (error: unknown) => error instanceof Ga4DomainError && error.code === 'provider_error');
});

test('paused/un-capable registry entries are not reportable and duplicate bindings are rejected', () => {
  assert.equal(isReportableSite({ ...site, status: 'paused' }), false);
  assert.equal(isReportableSite({ ...site, ga4Enabled: false }), false);
  assert.throws(() => validateRegistry([site, { ...site, id: 'other-site' }]));
});

test('demo composition is rejected by Functions and non-loopback standalone entrypoints', () => {
  const demo = runtimeConfig({ FIRSTLINE_MODE: 'demo' });
  assert.throws(() => assertFunctionsComposition(demo));
  assert.throws(() => assertLocalDemoComposition(demo, '0.0.0.0'));
  assert.doesNotThrow(() => assertLocalDemoComposition(demo, '127.0.0.1'));
});
