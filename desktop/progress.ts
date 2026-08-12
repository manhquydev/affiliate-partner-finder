import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';
import type { ProgressSnapshot } from './types.ts';

const FORBIDDEN_PROFILE_RE =
  /(Google[/\\]Chrome[/\\]User Data|google-chrome[/\\]User Data|Chromium[/\\]User Data|Microsoft[/\\]Edge[/\\]User Data)/i;

function normalizePath(p: string): string {
  return resolve(p);
}

/** True if candidate is inside root (or equal). */
export function isPathInside(root: string, candidate: string): boolean {
  const r = normalizePath(root);
  const c = normalizePath(candidate);
  if (c === r) return true;
  const prefix = r.endsWith(sep) ? r : r + sep;
  return c.startsWith(prefix);
}

export function assertSafeJobPaths(opts: {
  out: string;
  profile: string;
  allowedOutRoot?: string;
  allowedProfileRoot?: string;
}): { out: string; profile: string } {
  const out = normalizePath(opts.out);
  const profile = normalizePath(opts.profile);

  if (FORBIDDEN_PROFILE_RE.test(profile)) {
    throw new Error('profile must not be the browser default User Data directory');
  }

  if (opts.allowedProfileRoot) {
    const root = normalizePath(opts.allowedProfileRoot);
    if (!isPathInside(root, profile)) {
      throw new Error(`profile must stay under ${root}`);
    }
  }

  if (opts.allowedOutRoot) {
    const root = normalizePath(opts.allowedOutRoot);
    if (!isPathInside(root, out)) {
      throw new Error(`out directory must stay under ${root}`);
    }
  }

  if (!isAbsolute(out) || !isAbsolute(profile)) {
    throw new Error('out and profile must be absolute paths');
  }

  return { out, profile };
}

export function readProgress(outDir: string): ProgressSnapshot | null {
  const path = join(outDir, 'progress.json');
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8');
    if (!raw.trim()) return null;
    const data = JSON.parse(raw) as ProgressSnapshot;
    if (typeof data.total !== 'number' || typeof data.completed !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function canStartFresh(outDir: string): boolean {
  const companies = join(outDir, 'companies.json');
  const jsonl = join(outDir, 'results.jsonl');
  if (existsSync(companies)) return false;
  if (existsSync(jsonl)) {
    try {
      if (statSync(jsonl).size > 0) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function resolveExistingPath(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return normalizePath(p);
  }
}
