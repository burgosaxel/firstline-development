import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const evidenceDirectory = resolve(root, 'qa-evidence', 'hosting-local');
const firebase = resolve(root, 'analytics', 'node_modules', '.bin', 'firebase');
const command = process.platform === 'win32' ? `${firebase}.cmd` : firebase;
let child;
let result;

function request(port, path) {
  return new Promise((resolveRequest, reject) => {
    const requestTimeout = setTimeout(() => reject(new Error(`Timed out requesting ${port}${path}`)), 1000);
    const request = http.get({ host: '127.0.0.1', port, path }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        clearTimeout(requestTimeout);
        resolveRequest({ status: response.statusCode, body: Buffer.concat(chunks).toString('utf8') });
      });
    });
    request.on('error', (error) => {
      clearTimeout(requestTimeout);
      reject(error);
    });
  });
}

async function eventually(test) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return await test();
    } catch (error) {
      lastError = error;
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
  }
  throw lastError;
}

async function assertStaticRoot(port, allowedPath, allowedText) {
  const allowed = await eventually(async () => {
    const response = await request(port, allowedPath);
    assert.equal(response.status, 200, `${port}${allowedPath} must be served`);
    assert.match(response.body, allowedText);
    return response;
  });
  const exclusions = [];
  for (const path of ['/analytics/package.json', '/analytics/apps/web/src/main.tsx', '/firebase.json', '/docs/ANALYTICS-INTEGRATION.md', '/scripts/check-hosting-manifest.mjs']) {
    const response = await request(port, path);
    assert.equal(response.status, 404, `${port}${path} must be unavailable`);
    exclusions.push({ path, status: response.status });
  }
  return { allowed: { path: allowedPath, status: allowed.status }, exclusions };
}

async function stopEmulator() {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGINT');
  await Promise.race([
    new Promise((resolveExit) => child.once('exit', resolveExit)),
    new Promise((resolveWait) => setTimeout(resolveWait, 5000))
  ]);
  if (child.exitCode === null) {
    child.kill('SIGKILL');
    await new Promise((resolveExit) => child.once('exit', resolveExit));
  }
}

async function assertPortClosed(port) {
  await assert.rejects(request(port, '/'));
}

try {
  const networkDevices = (await readFile('/proc/net/dev', 'utf8')).trim().split('\n').slice(2).map((line) => line.trim().split(':')[0]);
  assert.deepEqual(networkDevices, ['lo'], 'static emulator must run in a loopback-only network namespace');
  const routes = await readFile('/proc/net/route', 'utf8');
  assert.equal(routes.trim().split('\n').length, 1, 'static emulator namespace must have no network routes');

  child = spawn(command, ['emulators:start', '--project', 'demo-firstline-migration', '--config', 'firebase.local.json', '--only', 'hosting', '--log-verbosity', 'SILENT'], {
    cwd: root,
    env: { ...process.env, CI: '1', FIREBASE_CLI_ANALYTICS: 'false', NO_UPDATE_NOTIFIER: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const publicRoot = await assertStaticRoot(5008, '/index.html', /FirstLine/i);
  const analyticsRoot = await assertStaticRoot(5013, '/index.html', /Analytics/i);
  result = {
    success: true,
    candidate: process.env.CANDIDATE_SHA ?? null,
    networkNamespace: { interfaces: networkDevices, routeLines: routes.trim().split('\n').length },
    roots: { public: publicRoot, analytics: analyticsRoot }
  };
} finally {
  await stopEmulator();
  if (result) {
    await assertPortClosed(5008);
    await assertPortClosed(5013);
    result.listenerShutdown = true;
    await mkdir(evidenceDirectory, { recursive: true });
    await writeFile(resolve(evidenceDirectory, 'run-result.json'), `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result));
  }
  await rm(resolve(root, '.hosting-public'), { recursive: true, force: true });
}
