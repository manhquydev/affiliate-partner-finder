// Deterministic classifier — the decision table from docs/05 §6 / docs/06 §3.
// Pure function, no I/O. This is where the anti-hallucination rules live:
//   - loadStatus !== 'ok'  ⇒ NEVER 'none'; always unknown/blocked.
//   - soft-404 guard happens upstream (path-probe returns [] when junk===200),
//     so by the time we see pathHits here they are already trustworthy.

import type { ClassifyInput, Classification } from './types';

export function classify(input: ClassifyInput): Classification {
  const {
    loadStatus,
    linkHits = [],
    platformHits = [],
    networkHits = [],
    pathHits = [],
  } = input;

  // Row 1 — could not trust the page: never conclude 'none'.
  if (loadStatus !== 'ok') {
    return { verdict: 'unknown', confidence: 'blocked' };
  }

  const strongLink = linkHits.some((h) => h.isStrong);
  // DOM platformHits and networkHits are both strong platform evidence.
  const hasPlatform = platformHits.length > 0 || networkHits.length > 0;
  // Row 2 — clear affiliate signal on the page (or network).
  if (strongLink || hasPlatform) {
    return { verdict: 'affiliate', confidence: 'high' };
  }

  const strongPath = pathHits.some((h) => h.isStrong);
  // Row 3 — an affiliate path exists even if not linked from the homepage.
  if (strongPath) {
    return { verdict: 'affiliate', confidence: 'medium' };
  }

  const weakLink = linkHits.some((h) => !h.isStrong);
  // Any remaining pathHit is non-strong (strong ones returned above) ⇒ weak.
  const weakPath = pathHits.length > 0;

  // Row 4 — corroborated partner/trade signal.
  if (weakLink && weakPath) {
    return { verdict: 'partner_trade', confidence: 'medium' };
  }
  // Row 5 — single weak signal.
  if (weakLink || weakPath) {
    return { verdict: 'partner_trade', confidence: 'low' };
  }

  // Row 6 — loaded fine, nothing found ⇒ true negative.
  return { verdict: 'none', confidence: 'high' };
}
