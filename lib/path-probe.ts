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

export async function pathProbe(
  origin: string,
  paths: string[],
): Promise<PathProbeResult> {
  let junk: number | 'err';
  try {
    const r = await fetch(`${origin}/zzq-${Date.now()}-${Math.random().toString(36).slice(2)}`, {
      redirect: 'follow',
    });
    junk = r.status;
  } catch {
    junk = 'err';
  }

  // Soft-404: everything returns 200 → cannot distinguish real pages.
  if (junk === 200) {
    return { junkBaselineStatus: junk, pathHits: [] };
  }

  const hits: PathHit[] = [];
  for (const p of paths) {
    try {
      const r = await fetch(`${origin}${p}`, { redirect: 'follow' });
      if (r.status !== junk && [200, 301, 302].includes(r.status)) {
        hits.push({
          path: p,
          status: r.status,
          finalUrl: r.url,
          isStrong: /affiliat/.test(p),
        });
      }
    } catch {
      // network error on a single path — ignore, keep probing others.
    }
  }

  return { junkBaselineStatus: junk, pathHits: hits };
}
