# Cook Phase 01 — network hosts / classify merge

**Timestamp:** 2026-08-13  
**Plan:** `plans/260813-0816-network-lazy-settle-quality-track-a/`  
**Scope:** PHASE 1 only (contracts & classify merge)

## STATUS: DONE

## What shipped

| Item | Path / note |
|------|-------------|
| Pure host matcher | `lib/network-hosts.ts` — `isPlatformHost`, `hostOf`, `matchPlatformOnHost/Url`; CDN alias table empty allowlist (`NETWORK_CDN_ALIASES`) for phase 2 |
| Types | `Evidence.networkHits?`, `ClassifyInput.networkHits?` |
| Classify | nonempty `networkHits` ⇒ same as `platformHits` (`affiliate`/`high`); `loadStatus!=='ok'` still ⇒ `unknown` |
| Export | `method: 'network'`; `strongestEvidence` / `simpleHit` / `simpleHint` honor networkHits |
| Labels / options UI | `METHOD_LABEL.network`; options detail shows network hits |
| Tests | `test/network-hosts.test.ts` (substring FP drawing.com∉awin, suffix/alias policy); classify + export cases |

## Locks honored (M1–M3)

- **M3:** Host-matcher unit tests green **before** phase-2 always-on network→classify. CDN = allowlist suffix/exact only (table empty until phase 2).
- **M1/M2:** No ship claims / no settle flag this phase (phase 3+).
- No Playwright listeners (phase 2). Running shards untouched.

## Tests

```
npm test -- test/network-hosts.test.ts test/classify.test.ts test/export.test.ts
→ 50 passed
```

(Also green with detector/desktop-adapter/early-exit: 83 passed.)

## detectorVersion

Not bumped yet — network collection not wired. Phase 2 should bump when CLI emits `networkHits` on live scans. Schema field documented on `Evidence.networkHits`.

## Not done (later phases)

- Playwright `page.on('request'|'response')` collectors
- CDN alias rows (dwin1, etc.)
- `--lazy-settle` / MutationObserver

## Commit

Not committed (per task).
