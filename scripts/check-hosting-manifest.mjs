import { lstat, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { listFiles } = require('../analytics/node_modules/firebase-tools/lib/listFiles.js');
const allowedPublic = new Set([
  'FLD QR Code.png',
  'Logo_Dark.png',
  'Logo_Light.png',
  'favicon.png',
  'index.html',
  'pricing.html',
  'privacy.html',
  'script.js',
  'styles.css',
  'terms.html',
  'assets/bloominfive-desktop.png',
  'assets/bloominfive-mobile.png',
  'assets/ebanisteriacad-desktop.png',
  'assets/ebanisteriacad-mobile.png',
  'assets/tripletas-la-union-desktop.png',
  'assets/tripletas-la-union-mobile.jpg',
  'connect/firstline-contact.vcf',
  'connect/fl-logo.png',
  'connect/index.html'
]);

const blockedRoots = new Set(['.git', '.worktrees', 'analytics', 'functions', 'docs', 'scripts', 'tests', 'node_modules', 'qa-evidence']);
const ignoredFiles = new Set(['.firebaserc', '.gitignore', 'firebase.json', 'firebase.local.json', 'firestore.rules', 'firestore.indexes.json', 'CNAME', 'ANALYTICS_EVENT_CONTRACT.md', 'PRODUCTION_ANALYTICS_STAGE1.md']);
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    const path = relative(root, absolute).split(sep).join('/');
    const metadata = await lstat(absolute);
    if (metadata.isSymbolicLink()) throw new Error(`Hosting source must not contain symlinks: ${path}`);
    if (ignoredFiles.has(path) || path.startsWith('.') || /^firebase-debug(?:\..+)?\.log$/.test(path)) continue;
    if (metadata.isDirectory()) {
      if (blockedRoots.has(path) || path.startsWith('.')) continue;
      await walk(absolute);
      continue;
    }
    if (!metadata.isFile()) throw new Error(`Unexpected non-file Hosting source entry: ${path}`);
    files.push(path);
  }
}

await walk(root);
const unexpected = files.filter((path) => !allowedPublic.has(path));
const missing = [...allowedPublic].filter((path) => !files.includes(path));
if (unexpected.length || missing.length) {
  throw new Error(`Public Hosting manifest mismatch. unexpected=${JSON.stringify(unexpected)} missing=${JSON.stringify(missing)}`);
}
const config = JSON.parse(readFileSync(resolve(root, 'firebase.json'), 'utf8'));
const publicHosting = config.hosting.find((entry) => entry.target === 'public');
const firebaseFiles = listFiles(root, publicHosting.ignore).sort();
const expectedFiles = [...allowedPublic].sort();
if (JSON.stringify(firebaseFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error(`Firebase Hosting upload manifest mismatch. actual=${JSON.stringify(firebaseFiles)} expected=${JSON.stringify(expectedFiles)}`);
}
console.log(`Hosting manifest OK (${files.length} explicit public files; Firebase listFiles exact).`);
