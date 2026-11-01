import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const readText = (path) => readFileSync(new URL(path, root), 'utf8');

test('combined Firebase configuration isolates public and Analytics Hosting', () => {
  const config = readJson('firebase.json');
  assert.deepEqual(config.firestore, { rules: 'firestore.rules', indexes: 'firestore.indexes.json' });
  assert.ok(Array.isArray(config.hosting));
  assert.equal(config.hosting.length, 2);
  const publicHosting = config.hosting.find((entry) => entry.target === 'public');
  const analyticsHosting = config.hosting.find((entry) => entry.target === 'analytics');
  assert.equal(publicHosting.public, '.');
  for (const pattern of ['.hosting-public', '.hosting-public/**', 'analytics', 'analytics/**', '.git', '.git/**', '.worktrees', '.worktrees/**', 'functions', 'functions/**', 'docs', 'docs/**', 'scripts', 'scripts/**', 'tests', 'tests/**', '.env*']) assert.ok(publicHosting.ignore.includes(pattern), `public Hosting must ignore ${pattern}`);
  assert.equal(analyticsHosting.public, 'analytics/apps/web/dist');
  assert.deepEqual(analyticsHosting.rewrites, [
    { source: '/api/**', function: { functionId: 'analyticsApi', region: 'us-central1' } },
    { source: '**', destination: '/index.html' }
  ]);
  assert.equal(JSON.stringify(analyticsHosting), JSON.stringify(analyticsHosting).replace('pinTag', 'unexpected'), 'Analytics Hosting must not use pinTag');

  const aliases = readJson('.firebaserc');
  assert.deepEqual(aliases.targets['firstline-development'].hosting.public, ['firstline-development']);
  assert.deepEqual(aliases.targets['firstline-development'].hosting.analytics, ['firstline-analytics']);
});

test('Functions codebases and shared Firestore authority remain distinct', () => {
  const config = readJson('firebase.json');
  assert.deepEqual(config.functions.map(({ source, codebase, runtime }) => ({ source, codebase, runtime })), [
    { source: 'functions', codebase: 'default', runtime: 'nodejs22' },
    { source: 'analytics/functions-source', codebase: 'analytics', runtime: 'nodejs22' }
  ]);
  assert.deepEqual(new Set(config.functions.map((entry) => entry.codebase)).size, 2);
  assert.equal(readText('firestore.rules'), "rules_version = '2';\n\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if false;\n    }\n  }\n}\n");
  assert.equal(readText('firestore.indexes.json'), '{\n  "indexes": [],\n  "fieldOverrides": []\n}\n');
});

test('the child retains its package boundary and legacy Firebase files are non-authoritative', () => {
  assert.equal(existsSync(new URL('package.json', root)), false);
  for (const path of ['analytics/package.json', 'analytics/package-lock.json', 'analytics/apps/web/package.json', 'analytics/apps/api/package.json', 'analytics/packages/contracts/package.json']) assert.equal(existsSync(new URL(path, root)), true, `${path} missing`);
  const child = readJson('analytics/package.json');
  assert.deepEqual(child.workspaces, ['apps/*', 'packages/*']);
  const guide = readText('docs/ANALYTICS-INTEGRATION.md');
  assert.match(guide, /snapshot-import candidate/i);
  assert.match(guide, /does not import Analytics Git history/i);
  assert.match(guide, /non-authoritative/i);
  assert.match(guide, /firebase deploy --project firstline-development --config firebase.json --only hosting:analytics/);
  assert.doesNotMatch(guide, /\bfirebase deploy\s*$/m);
  assert.doesNotMatch(guide, /firebase deploy[^\n]*--only hosting(?:\s|$)/);
  assert.doesNotMatch(guide, /firebase deploy[^\n]*--only functions(?:\s|$)/);
});

test('local static configuration has no production targets or API rewrites', () => {
  const local = readJson('firebase.local.json');
  assert.deepEqual(local.emulators.hosting, { host: '127.0.0.1', port: 5008 });
  assert.equal(local.functions, undefined);
  assert.equal(local.firestore, undefined);
  assert.equal(local.hosting.length, 2);
  assert.equal(local.hosting.find((entry) => entry.site === 'demo-firstline-public').public, '.hosting-public');
  assert.match(readText('scripts/prepare-hosting-static.mjs'), /Prepared .* explicit public static files/);
  assert.match(readText('scripts/check-local-hosting-emulator.mjs'), /loopback-only network namespace/);
  for (const entry of local.hosting) {
    assert.match(entry.site, /^demo-firstline-/);
    assert.equal(entry.rewrites, undefined);
  }
  assert.equal(local.targets, undefined);
  assert.equal(local.projects, undefined);
});
