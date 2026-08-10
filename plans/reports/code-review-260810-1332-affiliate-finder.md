# Code Review — Affiliate/Partner Finder v1 (post-implementation)

Reviewer: `code-reviewer` subagent · 2026-08-10 · ~1388 LOC · tsc clean · 49/49 tests.

## Verdict
Spec-faithful. One anti-hallucination defect + several robustness bugs found; the
critical + high + cheap ones **fixed and regression-tested**. Two medium items
accepted for v1 (documented). Live-browser acceptance still pending manual run.

## Dispositions
| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| C1 | Critical | Platform match was `href.includes(token)` → `drawing.com` matched `awin` → fabricated `affiliate/high` | **FIXED** — host-boundary match (`lib/detector.ts`); regression tests added |
| H1 | High | path-probe `executeScript` throw fell to outer catch → discarded confirmed link evidence as `unknown` | **FIXED** — probe isolated in own try/catch (`lib/scan.ts`) |
| H2 | High | `waitForComplete` attached listener after `tabs.create` → fast `complete` missed → false timeout | **FIXED** — initial `tabs.get` status check (`lib/scan.ts`) |
| H3 | High | strong keyword on anchor TEXT with empty href → `affiliate` with empty `evidenceUrl` | **FIXED** — prefer hrefful hit, fall back to `finalUrl` (`lib/export.ts`) |
| M2 | Medium | `START` mid-run only guarded by popup; background could clear/collect over live loop | **FIXED** — background START guard (`entrypoints/background.ts`) |
| M3 | Medium | alarm period 0.4min below Chrome 30s min; comment wrong | **FIXED** — 0.5min + corrected comment |
| L2 | Low | no test guarded injected-fn self-containment (criterion 4) | **FIXED** — `toString()` reconstruction smoke tests (detector + path-probe) |
| L3 | Low | collect throw on a late-page challenge discarded earlier-page companies | **FIXED** — keep collected, break instead of throw (`lib/collect.ts`) |
| L4 | Low | retry loop didn't re-check pause/stop | **FIXED** — re-check progress before each retry |
| M1 | Medium | orphaned scan tab if SW killed mid-scan | **ACCEPTED v1** — non-corrupting; rescan is idempotent by domain; single inactive tab |
| M4 | Medium | `patchProgress` read-modify-write lost-update race | **ACCEPTED v1** — very low probability given long per-company gaps |
| L1 | Low | tiny page (<5 links) → `blocked` | **BY SPEC** (docs/05 §7) |

## Confirmed-good (reviewer)
- `classify()` never returns `none` when `loadStatus!=='ok'` (all callers). 
- path-probe soft-404 guard + HTTP-status-only logic correct.
- Retry excludes `blocked`; no login/form/CAPTCHA bypass; local-only.
- `loopRunning` check-then-set atomic within a SW lifetime.
- CSV columns == docs/06 §4; formula-injection guarded.

## Open questions (answered)
1. Build target = ESNext / modern Chrome → L2 stays safe (spread/async native).
2. `<all_urls>` is an accepted product requirement (docs/04 §5) — not narrowed in v1.
3. Start mid-run → now **rejected** by the M2 background guard.
