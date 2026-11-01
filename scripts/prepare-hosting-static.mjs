import { cp, lstat, mkdir, rm } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, '.hosting-public');
const allowedPublic = [
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
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of allowedPublic) {
  const source = resolve(root, path);
  const destination = resolve(output, path);
  const metadata = await lstat(source);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`Public Hosting source must be a regular file: ${path}`);
  await mkdir(resolve(destination, '..'), { recursive: true });
  await cp(source, destination, { force: true });
}
console.log(`Prepared ${allowedPublic.length} explicit public static files in ${relative(root, output).split(sep).join('/')}.`);
