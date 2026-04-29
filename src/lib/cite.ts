import citeMeta from '../../src/data/cite-meta.json';

export interface CiteRef {
  repo: string;
  path: string;
  line?: number | string;
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
  pathPrefix?: string;
}

const meta = citeMeta as Record<string, RepoMeta>;

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
  const repo = meta[ref.repo];
  const lineSuffix = ref.line != null ? `:${ref.line}` : '';
  const display = `${ref.repo}/${ref.path}${lineSuffix}`;

  if (!repo) return { ...ref, url: null, display };

  const frag = lineFragment(ref.line);
  const fullPath = (repo.pathPrefix ?? '') + ref.path;
  let url: string;
  if (repo.host === 'github') {
    url = `${repo.webBase}/blob/${repo.sha}/${fullPath}${frag}`;
  } else if (repo.host === 'gitlab') {
    url = `${repo.webBase}/-/blob/${repo.sha}/${fullPath}${frag}`;
  } else {
    url = repo.webBase;
  }
  return { ...ref, url, display };
}
