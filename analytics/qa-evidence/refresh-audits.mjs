import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';

const run = promisify(execFile);
const audits = [
  { args: ['audit', '--json'], file: 'qa-evidence/current-audit-full.json' },
  { args: ['audit', '--omit=dev', '--json'], file: 'qa-evidence/current-audit-production.json' }
];
for (const { args, file } of audits) {
  try {
    const { stdout } = await run('npm', args, { maxBuffer: 10 * 1024 * 1024 });
    await writeFile(file, stdout);
    console.log(`${file}: exit=0`);
  } catch (error) {
    const stdout = error.stdout ?? '';
    JSON.parse(stdout);
    await writeFile(file, stdout);
    console.log(`${file}: exit=${error.code}`);
  }
}
