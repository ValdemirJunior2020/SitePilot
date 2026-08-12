import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve('src');
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.isFile() && full.endsWith('.js')) files.push(full);
  }
}
await walk(root);
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax OK: ${files.length} server files`);
