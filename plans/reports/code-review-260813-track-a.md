# Code review: Track A (network evidence + lazy settle)

**Mode:** `ak:code-review --pending`  
**Date:** 2026-08-13  
**Scope:** Track A only — `lib/network-*.ts`, classify/export/types/config/labels, `cli/{browser,scan,index}`, desktop argv/types flags, related tests, README CLI notes, options networkHits display.  
**Ignored:** shard-monitor, impeccable plans, desktop ETA UI (except `JobOptions` flag fields co-located in `desktop/types.ts`).  
**Do not commit / do not push.**

## Verdict summary

Flags default **OFF**; observe-only (no `page.route`); settle **replaces** 1200ms when `--lazy-settle` on. Full `npm test`: **129 passed**. Safe for default-path merge; fix verify-golden sync before `--network-evidence` A/B measurement.

**STATUS: APPROVE_WITH_NITS**

## Ethics / locks

| Check | Evidence | Result |
|-------|----------|--------|
| `--lazy-settle` default OFF | `cli/index.ts` `lazySettle: false`; desktop omits unless set | PASS |
| `--network-evidence` default OFF | same; classify merge gated on flag | PASS |
| Settle replaces, never stacks | `settleForScan` single path | PASS |
| Budget ≤1200ms; A7 clamp | `resolveLazySettleBudgetMs` + tests | PASS |
| No blanket `page.route` | collectors via `page.on` only; comment + no route in Track A paths | PASS |
| Live 10k untouched by defaults | flags off; argv stubs opt-in only | PASS |
| No CAPTCHA / concurrency↑ | not introduced | PASS |

## Bugs / regressions

| # | Finding | Sev |
|---|---------|-----|
| 1 | `test/verify-golden.mjs` `simpleHit` mirror **omits `networkHits`** while comment says keep in sync with `lib/export.simpleHit`. Network-only affiliate rows fail live golden gate / look like `false`. | **MUST-FIX** (before `--network-evidence` measurement / A2) |
| 2 | README documents `--lazy-settle` but **not** `--network-evidence` (CLI `--help` has both). Phase-2 “document flag” incomplete. | NICE (docs) |
| 3 | `settleLazy` `Promise.race` abandons in-page evaluate on wall hit; scroll/MO may still run into `runDetector` evaluate window (mild interference; rare if page JS stalls). | NICE |
| 4 | Quiet DOM (`quietMs=150`) can exit settle ≪1200ms on static pages — intentional A7 win; may miss late pixels that do not mutate DOM. Measure under A6/A7 before enabling on hot path. | NICE (ops) |
| 5 | `isPlatformHost` duplicated in `lib/detector.ts` inject vs `lib/network-hosts.ts` — drift risk. | NICE |
| 6 | `DETECTOR_VERSION` always **1.1.0** even when flags OFF (capability bump, not flag-scoped). | NICE |
| 7 | `strongestEvidence` now emits `method=platform` for platformHits-only (previously could fall through to empty). Behavior change with flags OFF; improves audit; tests updated/green. | OK (fix) |
| 8 | `shouldSkipPathProbe` ignores `networkHits` — conservative (probe still runs if only network hit); OK. | OK |
| 9 | Extension still `sleep(700)` — documented CLI-first gap. | OK (non-goal) |

## Test gaps

| Gap | Notes |
|-----|-------|
| `verify-golden.mjs` vs export `simpleHit` | MUST-FIX above |
| No Playwright integration for attach-before-`goto` / settle wall | Unit coverage is pure helpers only |
| No settleLazy timing soak | Budget pure tests only (`test/lazy-settle-budget.test.ts`) |
| No golden fixture with `networkHits` | Phase-4 still open for A4 network path |
| A3 HITL labels | Deferred by design |

**Covered well:** host-boundary FP (`drawing.com`), CDN allowlist suffix-only, collector dedupe, classify loadStatus≠ok, export `method=network`, desktop argv defaults OFF.

## MUST-FIX

1. Update `test/verify-golden.mjs` `simpleHit` to include `networkHits` (parity with `lib/export.ts`).

## NICE

1. README bullet for `--network-evidence` (default OFF, observe-only).  
2. Cancel/await settle evaluate before detector (or `page.evaluate` abort pattern) to avoid concurrent settle vs detector.  
3. Share `isPlatformHost` from `lib/network-hosts.ts` into detector inject path (or codegen) to prevent drift.  
4. Optional min settle floor when `--lazy-settle` if A/B shows quiet-exit recall loss.  
5. Golden / sample measurement run (phase-4) before claiming A1–A2.

## Spec compliance (plan locks)

| Lock | Status |
|------|--------|
| M2 lazy default OFF, replace 1200, A7>A6 | Met |
| M3 matcher tests before always-on classify | Met (classify behind `--network-evidence`) |
| No unknown% as Track A success | Docs/metrics report OK; code N/A |
| CDN allowlist only | Met (`NETWORK_CDN_ALIASES`) |

## Files reviewed (Track A)

- Added: `lib/network-hosts.ts`, `lib/network-collector.ts`, `test/network-*.ts`, `test/lazy-settle-budget.test.ts`
- Modified: `cli/browser.ts`, `cli/scan.ts`, `cli/index.ts`, `lib/{classify,export,types,config,labels}.ts`, `desktop/{build-scan-argv,types}.ts`, `entrypoints/options/main.ts` (networkHits UI), `README.md`, related tests

## STATUS: APPROVE_WITH_NITS
