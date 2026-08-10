# Code Review — Long-run refactor (loop → dashboard page) + cross-run dedup

Reviewer: `code-reviewer` subagent · 2026-08-10 · focus: continuity, dedup, races, regression.
Post-fix: `tsc` clean · 57/57 tests · build OK.

## Dispositions
| ID | Sev | Issue | Status |
|----|-----|-------|--------|
| H1 | High | Session lock TTL (12s) < one iteration (resolve+scan+retries ~60s+) → 2 dashboards double-scan | **FIXED** — independent heartbeat `setInterval(4s)` keeps lock fresh (`run-engine.ts` startHeartbeat/stopHeartbeat) |
| H2 | High | `resumeIfInterrupted` marked `running:false` even when paused → run unresumable | **FIXED** — `cur?.paused` guard before finish |
| H3 | High | Resume always used `pickUnscanned` → paused/interrupted `refreshStale` abandoned stale-but-scanned companies | **FIXED** — persist `Progress.mode`; resume re-derives work set by mode (`pickStaleCompanies` for refreshStale) |
| M1 | Med | `patch()` read-modify-write could clobber a concurrent Pause flag | **FIXED** — patch re-reads latest `paused`/`running` right before write |
| M2 | Med | Storage error mid-loop left `running:true` + lock held, no onError | **FIXED** — `try/finally` around loop always releases lock + surfaces onError |
| L1 | Low | `storage.onChanged` bailed on `localBusy` before removing pendingRun | **FIXED** — consume pendingRun regardless, then drop if busy |
| M3 | Med | `companies` store grows unbounded → refreshStale cost scales with all history | **ACCEPTED v1** — noted; add a cap later if needed |
| L2 | Low | Pause during retry still saves a `blocked` result → domain not retried on resume | **ACCEPTED v1** — minor |
| L3 | Low | Popup `PendingRun` omits `staleDays` | **ACCEPTED** — popup only issues `'new'`; staleDays irrelevant there |
| L4 | Low | exact-`staleDays`-old = not stale (strict `>`) | **BY DESIGN** |

## Regression check — PASS (reviewer)
classify still forces `unknown/blocked` for non-ok load; scanOne closes tab on every path; probe failure degrades without discarding detector evidence; resolve AbortController only affects the review-page branch. No evidence/verdict semantics changed.

## Testing gap (known)
Only the 3 pure helpers (`isStale`/`pickStaleCompanies`/`pickUnscanned`) are unit-tested. The loop, session lock, pause/resume, and `storage.onChanged` paths remain untested (need chrome/idb mocks) — verify in the live run (task #7).
