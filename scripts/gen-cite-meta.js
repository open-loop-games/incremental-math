#!/usr/bin/env node
// Regenerate src/data/cite-meta.json from open-loop-research submodule state.
// Runs automatically as a prebuild step; exits silently if open-loop-research
// is not present (CI uses the committed JSON instead).

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REF_ROOT = resolve(HERE, '../../open-loop-research');
const OUT = resolve(HERE, '../src/data/cite-meta.json');

const PATH_PREFIX = { paperclips: 'docs/' };

if (!existsSync(resolve(REF_ROOT, '.gitmodules'))) {
  console.log('gen-cite-meta: open-loop-research not found, using committed cite-meta.json');
  process.exit(0);
}

const text = readFileSync(resolve(REF_ROOT, '.gitmodules'), 'utf8');
const sections = text.split(/^\[submodule /m).slice(1);
const pathToUrl = new Map();
for (const s of sections) {
  const pathMatch = s.match(/^\s*path\s*=\s*(.+)$/m);
  const urlMatch = s.match(/^\s*url\s*=\s*(.+)$/m);
  if (pathMatch && urlMatch) pathToUrl.set(pathMatch[1].trim(), urlMatch[1].trim());
}

const status = execSync('git submodule status', { cwd: REF_ROOT, encoding: 'utf8' });
const shaByPath = new Map();
for (const line of status.split('\n')) {
  const m = line.match(/^[\s\-+U]([0-9a-f]+)\s+(\S+)/);
  if (m) shaByPath.set(m[2], m[1]);
}

const out = {};
for (const [path, url] of pathToUrl) {
  const sha = shaByPath.get(path);
  if (!sha) continue;
  const repo = path.replace(/^reference-code\//, '');
  const webBase = url.replace(/\.git$/, '');
  let host = 'other';
  if (url.includes('github.com')) host = 'github';
  else if (url.includes('gitlab.com')) host = 'gitlab';
  out[repo] = { webBase, sha, host, ...(PATH_PREFIX[repo] ? { pathPrefix: PATH_PREFIX[repo] } : {}) };
}

// Corpora committed into open-loop-research directly rather than as submodules —
// decompiled Flash/Java trees with no hosted upstream. They cite by path only.
for (const entry of readdirSync(resolve(REF_ROOT, 'reference-code'), { withFileTypes: true })) {
  if (!entry.isDirectory() || out[entry.name]) continue;
  // Grouping directories (reference-code/adjacent/<family>/<repo>) are not corpora themselves.
  if (Object.keys(out).some((k) => k.startsWith(`${entry.name}/`))) continue;
  out[entry.name] = { host: 'local' };
}

writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${Object.keys(out).length} repos → src/data/cite-meta.json`);
