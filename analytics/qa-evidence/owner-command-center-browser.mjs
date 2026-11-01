import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const evidenceDir = resolve(root, 'qa-evidence/owner-command-center');
const candidateBase = 'http://127.0.0.1:5177';
const boundaryBase = 'http://127.0.0.1:5178';
const chrome = process.env.PLAYWRIGHT_CHROME ?? '/home/axel/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';
const events = [];
const failures = [];
const hash = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const brandingBaselineCommit = 'bd0987722ef8c2a41b8d4f8463410ce41b176910';

function start(command, args, cwd) {
  return spawn(command, args, { cwd, stdio: 'ignore', env: { ...process.env } });
}
async function stop(process, name) {
  if (process.exitCode !== null || process.signalCode !== null) return;
  const exited = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${name} did not stop after SIGTERM`)), 5000);
    process.once('exit', (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
  });
  process.kill('SIGTERM');
  await exited;
}
async function waitFor(url) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(url)).ok) return; } catch { /* loopback server is starting */ }
    await pause(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}
function expect(condition, message) { if (!condition) throw new Error(message); }
async function settleViewport(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Settled ${width}px layout has document-level horizontal overflow.`);
}

await mkdir(evidenceDir, { recursive: true });
const boundaryVite = start(resolve(root, 'node_modules/.bin/vite'), [resolve(root, 'apps/web'), '--host', '127.0.0.1', '--port', '5178'], root);
const candidateVite = start(resolve(root, 'node_modules/.bin/vite'), ['--config', 'qa-evidence/vite.browser-mock.config.mjs'], root);
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  await Promise.all([waitFor(boundaryBase), waitFor(candidateBase), waitFor(`${boundaryBase}/src/main.tsx`), waitFor(`${candidateBase}/src/main.tsx`)]);
  const boundary = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await boundary.route('**/*', (route) => {
    const url = route.request().url();
    return url.startsWith(boundaryBase) || url.startsWith('data:') ? route.continue() : route.abort();
  });
  boundary.on('request', (request) => events.push({ context: 'boundary', url: request.url() }));
  await boundary.goto(boundaryBase, { waitUntil: 'networkidle' });

  await boundary.getByRole('heading', { name: 'Sign in to FirstLine Analytics' }).waitFor();
  await boundary.screenshot({ path: `${evidenceDir}/login-auth-boundary-1440.png`, fullPage: true });
  expect(await boundary.getByRole('button', { name: 'Continue with Google' }).isDisabled(), 'Production auth boundary must fail closed without Firebase configuration.');
  await boundary.close();

  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.route('**/*', (route) => {
    const url = route.request().url();
    return url.startsWith(candidateBase) || url.startsWith('data:') ? route.continue() : route.abort();
  });
  page.on('request', (request) => events.push({ context: 'candidate', url: request.url() }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(candidateBase, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByRole('heading', { name: 'Overview' }).waitFor();
  const view = async (name, action) => { await action(); await page.screenshot({ path: `${evidenceDir}/${name}-1440.png`, fullPage: true }); };
  await settleViewport(page, 1440, 1100);
  await view('overview', async () => undefined);
  for (const width of [1024, 768, 430, 390, 375, 360]) {
    await settleViewport(page, width, 900);
    expect(await page.locator('.preset-row button').evaluateAll((buttons) => buttons.every((button) => button.scrollWidth <= button.clientWidth)), `Settled ${width}px layout clips a reporting-period preset.`);
    await page.screenshot({ path: `${evidenceDir}/overview-${width}.png`, fullPage: true });
  }
  await settleViewport(page, 1440, 1100);
  expect(await page.getByRole('navigation').getByRole('button').count() === 4, 'Expected all four shell navigation items.');
  expect(await page.getByRole('table', { name: 'GA4 daily traffic values' }).count() === 1, 'Trend requires a numeric table alternative.');
  expect(await page.getByRole('link', { name: 'Skip to content' }).count() === 1, 'Skip link missing.');
  expect(await page.locator('main').count() === 1, 'Main landmark missing.');
  await page.getByLabel('Custom start date').fill('2026-10-31');
  await page.getByLabel('Custom end date').fill('2026-10-01');
  expect(await page.getByRole('alert').count() > 0, 'Invalid reversed date range was not announced.');
  await page.getByLabel('Custom start date').fill('2026-07-31');
  await page.getByLabel('Custom end date').fill('2026-10-31');
  expect(await page.getByRole('alert').count() > 0, 'Date range longer than 90 inclusive days was not rejected.');
  await page.getByRole('button', { name: 'Last 7 days' }).click();
  await page.getByRole('button', { name: 'Last 30 days' }).click();
  await page.getByRole('button', { name: 'Last 90 days' }).click();

  await view('clients', async () => { await page.getByRole('button', { name: 'Clients' }).click(); await page.getByRole('heading', { name: 'Clients' }).waitFor(); });
  expect(await page.getByRole('button', { name: 'Open performance' }).count() === 4, 'Client registry rendering did not scale to all mock registry entries.');
  await view('client-detail', async () => { await page.getByRole('button', { name: 'Open performance' }).first().click(); await page.getByRole('heading', { name: 'Harbor Operations' }).waitFor(); });
  expect(await page.getByRole('table', { name: 'GA4 event breakdown' }).count() === 1, 'Client event table missing.');
  await view('reports', async () => { await page.getByRole('button', { name: 'Reports' }).click(); await page.getByRole('heading', { name: 'Reports' }).waitFor(); });
  await view('integrations', async () => { await page.getByRole('button', { name: 'Integrations' }).click(); await page.getByRole('heading', { name: 'Integrations' }).waitFor(); });
  expect(await page.getByText('Google Search Console').count() === 1 && await page.getByText('Unavailable. This portal has no Search Console connection, authorization, or metrics.').count() === 1, 'Search Console must be explicitly unavailable.');

  await page.getByRole('button', { name: 'Clients' }).click();
  await page.getByRole('button', { name: 'Open performance' }).nth(1).click();
  await page.getByRole('heading', { name: 'No analytics data for this range' }).waitFor();
  await page.getByRole('button', { name: 'Clients' }).click();
  await page.getByRole('button', { name: 'Open performance' }).nth(2).click();
  await page.getByRole('heading', { name: 'Analytics is not configured' }).waitFor();
  await page.getByRole('button', { name: 'Clients' }).click();
  await view('partial-data', async () => { await page.getByRole('button', { name: 'Open performance' }).nth(3).click(); await page.getByRole('heading', { name: 'Cedar Partners' }).waitFor(); await page.getByRole('status').filter({ hasText: 'Partial analytics data' }).waitFor(); });
  expect(await page.getByRole('status').filter({ hasText: 'Partial analytics data' }).count() === 1, 'Provider partial-data warning was not announced.');
  expect(await page.getByText('GA4 reported data loss from the other row; this response is partial and may exclude thresholded values.').count() === 1, 'Provider warning text was not retained.');
  expect((await page.locator('.metric strong').allTextContents()).join('|') === '31|47|119|8', 'Partial-data metrics must retain provider-returned values without zero substitution.');
  const body = await page.locator('body').innerText();
  expect(!/demo|fixture|northstar|tripletas/i.test(body), 'Production candidate contains prohibited fixture or demo leakage.');

  await page.getByRole('button', { name: 'Overview' }).click();
  await page.getByRole('heading', { name: 'Overview' }).waitFor();
  await settleViewport(page, 390, 900);
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  expect(await page.getByRole('button', { name: 'Toggle navigation' }).getAttribute('aria-expanded') === 'true', 'Mobile navigation did not expose open state.');
  expect(await page.getByRole('button', { name: 'Overview' }).evaluate((element) => document.activeElement === element), 'Opening the mobile drawer did not focus its first navigation target.');
  expect(await page.locator('aside').evaluate((element) => getComputedStyle(element).transitionDuration === '0s'), 'Reduced-motion preference did not disable the mobile drawer transition.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile layout has document-level horizontal overflow.');
  await page.screenshot({ path: `${evidenceDir}/mobile-navigation-390.png`, fullPage: true });
  await page.keyboard.press('Escape');
  expect(await page.getByRole('button', { name: 'Toggle navigation' }).getAttribute('aria-expanded') === 'false', 'Escape did not close the mobile drawer.');
  expect(await page.getByRole('button', { name: 'Toggle navigation' }).evaluate((element) => document.activeElement === element), 'Escape did not return focus to the mobile menu toggle.');
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('button', { name: 'Clients' }).click();
  expect(await page.getByRole('button', { name: 'Toggle navigation' }).getAttribute('aria-expanded') === 'false', 'Selecting a route did not close the mobile drawer.');
  expect(await page.getByRole('button', { name: 'Toggle navigation' }).evaluate((element) => document.activeElement === element), 'Route selection left focus trapped in the mobile drawer.');
  await page.close();

  const allowed = new Set([candidateBase, boundaryBase]);
  const externalRequests = events.filter(({ url }) => !url.startsWith('data:') && ![...allowed].some((base) => url.startsWith(base)));
  expect(externalRequests.length === 0, `Browser run made external requests: ${externalRequests.map(({ url }) => url).join(', ')}`);
  const artifacts = [
    ['login-auth-boundary-1440.png', '1440x1000'], ['overview-1440.png', '1440x1100'],
    ['overview-1024.png', '1024x900'], ['overview-768.png', '768x900'], ['overview-430.png', '430x900'],
    ['overview-390.png', '390x900'], ['overview-375.png', '375x900'], ['overview-360.png', '360x900'],
    ['clients-1440.png', '1440x1100'], ['client-detail-1440.png', '1440x1100'], ['reports-1440.png', '1440x1100'],
    ['integrations-1440.png', '1440x1100'], ['partial-data-1440.png', '1440x1100'], ['mobile-navigation-390.png', '390x900']
  ];
  const hashes = Object.fromEntries(await Promise.all(artifacts.map(async ([file]) => [file, await hash(`${evidenceDir}/${file}`)])));
  const git = async (args) => { const { execFile } = await import('node:child_process'); return await new Promise((resolve, reject) => execFile('git', args, { cwd: root }, (error, stdout) => error ? reject(error) : resolve(stdout.trim()))); };
  const candidateCommit = await git(['rev-parse', 'HEAD']);
  const candidateParentCommit = await git(['rev-parse', `${candidateCommit}^`]);
  const snapshotSourceCommit = 'dc1a6879e0c5761f22ab35eec318d7b93ed1d956';
  const snapshotSourceTree = 'b2b0b877ad3df85b3a47de0cd2f3f324751e9611';
  const sourceIsAncestor = await (async () => {
    const { execFile } = await import('node:child_process');
    return await new Promise((resolve) => {
      execFile('git', ['merge-base', '--is-ancestor', snapshotSourceCommit, candidateCommit], { cwd: root }, (error) => resolve(!error));
    });
  })();
  expect(sourceIsAncestor === false, 'Snapshot candidate must not retain Analytics source commit ancestry.');
  await writeFile(`${evidenceDir}/manifest.json`, JSON.stringify({
    candidateCommit, candidateParentCommit, brandingBaselineCommit, snapshotSourceCommit, snapshotSourceTree, sourceIsAncestor,
    baselineEvidence: { location: '/srv/node01/projects/firstline-org/firstline-analytics/.worktrees/t_0f8f1a37/qa-evidence/firstline-brand-revamp/before/manifest.json', baselineCommit: brandingBaselineCommit, retainedInCandidate: false, externalRetainedEvidence: true },
    browserHarness: { testOnly: true, mockAuthModule: 'qa-evidence/mock-firebase-auth.ts', mockTransportConfig: 'qa-evidence/vite.browser-mock.config.mjs', productionImported: false, loopbackOnly: true, externalRequests },
    screenshots: artifacts.map(([file, viewport]) => ({ file, viewport, sha256: hashes[file] })),
    assertions: ['owner auth boundary fails closed', 'shell navigation', '7/30/90 presets and invalid custom dates', 'registry scaling', 'ready, no-data, partial-data, and not-configured states', 'provider warning and provider-returned partial metrics without zero substitution', 'Search Console unavailable labeling', 'no fixture/demo leakage', 'landmarks/table alternative', 'settled no-overflow Overview at 1440/1024/768/430/390/375/360', 'mobile focus/open/Escape/route-close/aria/reduced-motion/overflow', 'zero external requests'],
    approvedReferenceComparison: 'This test-only snapshot preserves the approved dark sidebar, warm-surface hierarchy, panel/table/card system, and responsive navigation without retaining Analytics commit ancestry. It intentionally excludes historical demo fixtures, report snapshots, GSC/Clarity content, and historical auth/API contracts.'
  }, null, 2) + '\n');
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
  throw error;
} finally {
  await browser?.close();
  let listenerShutdown = false;
  try {
    await Promise.all([stop(candidateVite, 'candidate Vite listener'), stop(boundaryVite, 'boundary Vite listener')]);
    listenerShutdown = true;
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
  await writeFile(`${evidenceDir}/run-result.json`, JSON.stringify({ success: failures.length === 0, failures, listenerShutdown }, null, 2) + '\n');
  if (!listenerShutdown) throw new Error(failures.at(-1));
}
