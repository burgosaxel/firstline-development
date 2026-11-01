import { access, cp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve('.');
const source = resolve('functions-source');
const required = [
  'package.json',
  'package-lock.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'apps/api/dist/functions.js',
  'apps/api/dist/app.js',
  'packages/contracts/dist/index.js',
  'packages/contracts/package.json'
];
const production = JSON.parse(await readFile(resolve('firebase.production.example.json'), 'utf8'));
if (production.functions?.source !== 'functions-source') throw new Error('Functions source must be the generated reproducible functions-source artifact');
const ignored = production.functions?.ignore;
if (!Array.isArray(ignored) || !['**/node_modules/**', '.env*'].every((pattern) => ignored.includes(pattern))) throw new Error('Functions artifact must exclude dependencies and environment files');

await rm(source, { recursive: true, force: true });
await mkdir(source, { recursive: true });
await cp(resolve(root, 'package.json'), resolve(source, 'package.json'));
await cp(resolve(root, 'package-lock.json'), resolve(source, 'package-lock.json'));
await cp(resolve(root, 'apps/api/package.json'), resolve(source, 'apps/api/package.json'));
await cp(resolve(root, 'apps/web/package.json'), resolve(source, 'apps/web/package.json'));
await cp(resolve(root, 'apps/api/dist'), resolve(source, 'apps/api/dist'), { recursive: true });
await cp(resolve(root, 'packages/contracts/dist'), resolve(source, 'packages/contracts/dist'), { recursive: true });
await cp(resolve(root, 'packages/contracts/package.json'), resolve(source, 'packages/contracts/package.json'));

for (const file of required) await access(resolve(source, file), constants.R_OK);
const stagedEntries = await readdir(source);
if (!stagedEntries.includes('package-lock.json')) throw new Error('Functions source artifact omits its root lockfile');
try {
  await access(resolve(source, 'apps/api/dist/firebase.js'), constants.F_OK);
  throw new Error('retired Firebase Functions entrypoint is present in the source artifact');
} catch (error) {
  if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
}
const entrypoint = await readFile(resolve(source, 'apps/api/dist/functions.js'), 'utf8');
if (!entrypoint.includes('analyticsApi')) throw new Error('analyticsApi Functions entrypoint is missing');
const functionsModule = await import(pathToFileURL(resolve(source, 'apps/api/dist/functions.js')).href);
if (!functionsModule.analyticsApi) throw new Error('staged analyticsApi export cannot be imported');