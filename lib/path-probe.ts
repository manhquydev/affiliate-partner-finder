// Layer 3 path-probe — runs INSIDE the target page (same-origin fetch works;
// cross-origin does NOT, per docs/03 B1/B2). Also injected via executeScript, so
// it must be fully self-contained (no module-scope references).
//
// Anti-hallucination (docs/05 §C1):
//   1. Probe a random junk path first to get a baseline status.
//   2. Only trust a path hit when status !== junk AND status ∈ {200,301,302}.
//   3. Soft-404 guard: if the junk path itself returns 200, the site 200s on
//      everything → path-probe is meaningless → return no hits.
//   Uses HTTP status only, never body length (namly.dk returns a 695KB 404 body).

import type { PathProbeResult, PathHit } from './types';

/**
 * @param fetchTimeoutMs per-request abort (default 8s).
 * @param parallelBatch when >1, probe paths in parallel batches (default 1 = sequential).
 */
export async function pathProbe(
  origin: string,
  paths: string[],
  fetchTimeoutMs = 8000,
  parallelBatch = 1,
): Promise<PathProbeResult> {
  async function timedFetch(url: string): Promise<Response> {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), fetchTimeoutMs);
    try {
      return await fetch(url, { redirect: 'follow', signal: ac.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  let junk: number | 'err';
  try {
    const r = await timedFetch(`${origin}/zzq-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    junk = r.status;
  } catch {
    junk = 'err';
  }

  if (junk === 200) {
    return { junkBaselineStatus: junk, pathHits: [] };
  }

  const hits: PathHit[] = [];
  const batch = Math.max(1, Math.min(3, Math.trunc(parallelBatch) || 1));

  async function probeOne(p: string): Promise<PathHit | null> {
    try {
      const r = await timedFetch(`${origin}${p}`);
      if (r.status !== junk && [200, 301, 302].includes(r.status)) {
        return {
          path: p,
          status: r.status,
          finalUrl: r.url,
          isStrong: /affiliat/.test(p),
        };
      }
    } catch {
      /* single path fail */
    }
    return null;
  }

  if (batch === 1) {
    for (const p of paths) {
      const hit = await probeOne(p);
      if (hit) hits.push(hit);
    }
  } else {
    for (let i = 0; i < paths.length; i += batch) {
      const chunk = paths.slice(i, i + batch);
      const chunkHits = await Promise.all(chunk.map((p) => probeOne(p)));
      for (const h of chunkHits) {
        if (h) hits.push(h);
      }
    }
  }

  return { junkBaselineStatus: junk, pathHits: hits };
}
