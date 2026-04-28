import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REF_ROOT = resolve(HERE, '../../../open-loop-research');

export interface CiteRef {
  /** Submodule directory name under reference-code/, e.g. 'AntimatterDimensionsSourceCode'. */
  repo: string;
  /** Path within the repo. */
  path: string;
  /** Optional line or "start-end" range. */
  line?: number | string;
  /** Optional human note shown alongside the link. */
  note?: string;
}

export interface ResolvedCite extends CiteRef {
  url: string | null;
  display: string;
}

interface RepoMeta {
  webBase: string;
  sha: string;
  host: 'github' | 'gitlab' | 'other';
  /** Prepended to every cite path for repos whose source lives in a subdir. */
  pathPrefix?: string;
}

const PATH_PREFIX: Record<string, string> = {
  paperclips: 'docs/',
};

let cache: Map<string, RepoMeta> | null = null;

function loadRepoMeta(): Map<string, RepoMeta> {
  if (cache) return cache;
  const out = new Map<string, RepoMeta>();

  const text = readFileSync(resolve(REF_ROOT, '.gitmodules'), 'utf8');
  const sections = text.split(/^\[submodule /m).slice(1);
  const pathToUrl = new Map<string, string>();
  for (const s of sections) {
    const pathMatch = s.match(/^\s*path\s*=\s*(.+)$/m);
    const urlMatch = s.match(/^\s*url\s*=\s*(.+)$/m);
    if (pathMatch && urlMatch) {
      pathToUrl.set(pathMatch[1].trim(), urlMatch[1].trim());
    }
  }

  const status = execSync('git submodule status', { cwd: REF_ROOT, encoding: 'utf8' });
  const shaByPath = new Map<string, string>();
  for (const line of status.split('\n')) {
    const m = line.match(/^[\s\-+U]([0-9a-f]+)\s+(\S+)/);
    if (m) shaByPath.set(m[2], m[1]);
  }

  for (const [path, url] of pathToUrl) {
    const sha = shaByPath.get(path);
    if (!sha) continue;
    const repo = path.replace(/^reference-code\//, '');
    const webBase = url.replace(/\.git$/, '');
    let host: RepoMeta['host'] = 'other';
    if (url.includes('github.com')) host = 'github';
    else if (url.includes('gitlab.com')) host = 'gitlab';
    out.set(repo, { webBase, sha, host, pathPrefix: PATH_PREFIX[repo] });
  }

  cache = out;
  return out;
}

function lineFragment(line: number | string | undefined): string {
  if (line == null) return '';
  if (typeof line === 'number') return `#L${line}`;
  if (line.includes('-')) {
    const [a, b] = line.split('-');
    return `#L${a}-L${b}`;
  }
  return `#L${line}`;
}

export function cite(ref: CiteRef): ResolvedCite {
  const meta = loadRepoMeta().get(ref.repo);
  const lineSuffix = ref.line != null ? `:${ref.line}` : '';
  const display = `${ref.repo}/${ref.path}${lineSuffix}`;

  if (!meta) return { ...ref, url: null, display };

  const frag = lineFragment(ref.line);
  const fullPath = (meta.pathPrefix ?? '') + ref.path;
  let url: string;
  if (meta.host === 'github') {
    url = `${meta.webBase}/blob/${meta.sha}/${fullPath}${frag}`;
  } else if (meta.host === 'gitlab') {
    url = `${meta.webBase}/-/blob/${meta.sha}/${fullPath}${frag}`;
  } else {
    url = meta.webBase;
  }
  return { ...ref, url, display };
}
