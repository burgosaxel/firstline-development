import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../apps/api/src/app.ts';

const config = { mode: 'demo' as const, externalAccess: false, ga4Mode: 'disabled' as const, firebaseProjectId: 'test-project' };
const verifier = async () => ({ uid: 'owner', aud: 'test-project', email: 'firstlinedevnt@gmail.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } });
async function server() { const listener = createApp({ config, verifier }).listen(0, '127.0.0.1'); await new Promise<void>((resolve) => listener.once('listening', resolve)); const address = listener.address() as { port: number }; return { url: `http://127.0.0.1:${address.port}`, stop: () => new Promise<void>((resolve) => listener.close(() => resolve())) }; }
test('disabled GA4 boundary returns truthful no-provider unconfigured result', async () => { const local = await server(); try { const response = await fetch(`${local.url}/api/v1/sites/firstline-development/ga4-overview?start=2026-09-21&end=2026-10-20`, { headers: { Authorization: 'Bearer test' } }); const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.status, 'unconfigured'); assert.equal(body.metrics, null); assert.match(body.provenance, /no provider request/i); } finally { await local.stop(); } });