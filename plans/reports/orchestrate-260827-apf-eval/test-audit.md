---
type: tester
date: 2026-08-27
scope: track-s + full unit suite
command: npm run compile; npm run test:track-s; npm test
---

# Test Report — 2026-08-27 — APF eval (track-s + full suite)

Read-only audit. No code changes. Coverage not instrumented (`vitest` has no `coverage` config). `npm run test:desktop:e2e` not in this job.

## Summary

Unit and Track S suites are green. `tsc --noEmit` is red (33 errors) — known debt; tests still run because Vitest does not typecheck. Isolation of path-probe **results** is covered; isolation of **in-flight concurrency, abort, argv wiring, and Chrome profile occupancy** is not.

## Test Results Overview

| Command | Files | Tests | Passed | Failed | Skipped | Duration | Exit |
|---------|------:|------:|-------:|-------:|--------:|---------:|-----:|
| `npm run test:track-s` | 6 | 22 | 22 | 0 | 0 | 1.39s | 0 |
| `npm test` (`vitest run`) | 24 | 174 | 174 | 0 | 0 | 2.59s | 0 |
| `npm run compile` | — | — | — | **33 errors** | — | 2.8s | **2** |

- Vitest 2.1.9. `vitest.config.ts` excludes `test/desktop-electron.e2e.test.ts`.
- Failures: none in either test command.
- vs `plans/reports/test-track-s-phase5.md`: same 174 / 22; compile was not re-run then.

### Track S (`test:track-s`) — 22/22 PASS

| File | Tests |
|------|------:|
| `test/path-probe.test.ts` | 8 |
| `test/profile-timing.test.ts` | 7 |
| `test/track-s-cli-args.test.ts` | 2 |
| `test/track-s-ab-guard.test.ts` | 2 |
| `test/track-s-cohort.test.ts` | 2 |
| `test/track-s-compare.test.ts` | 1 |

### Full suite (`npm test`) — 174/174 PASS

| File | Pass | File | Pass |
|------|-----:|------|-----:|
| `classify.test.ts` | 30 | `desktop-adapter.test.ts` | 36 |
| `detector.test.ts` | 12 | `export.test.ts` | 10 |
| `network-hosts.test.ts` | 10 | `desktop-eta.test.ts` | 9 |
| `path-probe.test.ts` | 8 | `profile-timing.test.ts` | 7 |
| `collect-pagination.test.ts` | 5 | `run-engine.test.ts` | 5 |
| `close-quietly.test.ts` | 4 | `detector-config.test.ts` | 4 |
| `early-exit.test.ts` | 4 | `hide-chrome-window.test.ts` | 4 |
| `lazy-settle-budget.test.ts` | 4 | `network-collector.test.ts` | 4 |
| `release-gate.test.ts` | 4 | `labels.test.ts` | 3 |
| `virtual-display.test.ts` | 3 | `track-s-ab-guard.test.ts` | 2 |
| `track-s-cli-args.test.ts` | 2 | `track-s-cohort.test.ts` | 2 |
| `injectable.test.ts` | 1 | `track-s-compare.test.ts` | 1 |

Skipped in this run: **0**. Packaged e2e `it.skipIf(!execPath)` lives only in the excluded e2e file.

## Coverage Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Lines | n/a | 80% | SKIP (no c8/istanbul) |
| Branches | n/a | 70% | SKIP |
| Functions | n/a | 80% | SKIP |

`docs/07-test-plan.md` still claims “44/44 pass” — stale vs 174.

## Failed Tests

None.

## Compile (`npm run compile`) — FAIL, 33 errors

`tsconfig.json` `exclude`s `cli/` — CLI is not typechecked. Desktop/tests/lib/scripts are.

| Count | Code | Where |
|------:|------|-------|
| 16 | TS5097 `.ts` import paths | `desktop/{main,job-supervisor,build-scan-argv,ket-qua-counts}.ts`, `lib/config.ts`, `scripts/merge-shards.ts`, `test/collect-pagination.test.ts`, `test/desktop-electron.e2e.test.ts` |
| 10 | TS2339/2531/18048 | e2e: `window.affiliateDesktop`, null DOM, `win` possibly undefined |
| 4 | TS2353 | `test/early-exit.test.ts` — `totalLinks` not on `EarlyExitSignal` |
| 2 | TS2741/2739 | `test/desktop-adapter.test.ts` — `Evidence.junkBaselineStatus`, `LinkHit.{platform,isStrong}` |
| 1 | TS18047 | `lib/trustpilot-reader.ts:39` — `el` possibly null |

Tests pass while compile fails: Vitest transpile ≠ `tsc --noEmit`. CI that gates on `compile` stays red.

## Coverage gaps (module → test)

Covered well: `classify`, `detector`, `export`, `path-probe` anti-hallucination, desktop argv/ETA/job-lock/progress, network hosts/collector, collect pagination, labels, run-engine, Track S scripts (seed/compare/ab path guards).

| Module | Test | Gap |
|--------|------|-----|
| `lib/probe-batch.ts` | clamp only in `track-s-cli-args` | no `undefined` / float / negative / `Infinity` |
| `lib/path-probe.ts` parallel | hit-set equality only | no in-flight cap, abort, junk-before-paths |
| `cli/index.ts` `parseArgs` | `--help` text spawn | flag not exported; no argv → `probeParallelBatch` |
| `cli/scan.ts` `scanOnPage` | NONE | default `?? 1`; inject of 4th arg untested |
| `lib/scan.ts` | NONE | extension path-probe isolation vs CLI |
| `cli/browser.ts` | NONE | persistent profile / session reuse |
| `lib/{collect,storage,tab-utils,messages,resolve,next-data,trustpilot-reader}.ts` | NONE | |
| `lib/config.ts` | `maxPagesForLimit` only | detector paths / ethics constants |
| `desktop/main.ts` IPC | NONE (e2e separate) | `Boolean(opts.probeParallel)` |
| `desktop/renderer/` | NONE in unit | `#probeParallel` default |
| `scripts/{track-s-trial,finalize-track-s-ab,analyze-track-s-timings}.mjs` | NONE | |
| Golden live (`test/verify-golden.mjs`) | not in `npm test` | docs §5 still manual |

## Isolation coverage that exists

- `pathProbe` seq vs `parallelBatch=3` — **sorted path names equal** (`path-probe.test.ts`).
- `clampProbeBatchSize` 0→1, 99→3, NaN→3, 2→2.
- `--probe-parallel` help text “default OFF”; desktop argv omits unless `probeParallel: true`.
- `clampConcurrency` 1..3; job lock live PID; `assertSafeJobPaths` rejects Chrome User Data + `..` escape.
- `vi.restoreAllMocks()` after path-probe; virtual-display env restored in `afterEach`.
- `track-s-ab.sh` refuses `design-full-10k` and non-`track-s-*` out paths.

## Recommended isolation regression tests

Add to `test/path-probe.test.ts` (unit, no browser):

1. **In-flight cap** — instrument `fetch` with `inFlight`/`maxInFlight`. For `parallelBatch=3` and 8 delayed paths, `maxInFlight <= 3`. Would fail if `Promise.all(paths)` replaced chunking.
2. **Junk before paths** — assert first `fetch` pathname starts with `/zzq-` and no path fetch starts until junk settles. Would fail if junk raced with the first batch.
3. **Sibling abort** — first path `AbortError`, later path 200. Hits must still include the 200. `timedFetch` uses per-call `AbortController`; a shared controller would flake this.
4. **Internal clamp** — `pathProbe(..., 4)` behaves as 3 (`lib/path-probe.ts` `Math.min(3, …)`), independent of `clampProbeBatchSize`.
5. **Identical junk baseline** — seq vs parallel `junkBaselineStatus` equal (today only paths are compared).

Add to `test/track-s-cli-args.test.ts` (export `parseArgs` or test via a tiny helper):

6. Default argv → `probeParallel === false` (scan uses `probeParallelBatch: 1`).
7. `--probe-parallel` without batch → CLI `probeBatchSize === 3`.
8. `--probe-batch-size 99` → 3; `--probe-batch-size 0` → 1.
9. `--probe-batch-size` **without** `--probe-parallel` must **not** enable parallel (index.ts: `probeParallel ? probeBatchSize : 1`).

Desktop / profile:

10. `buildScanArgv({ probeParallel: true })` does **not** emit `--probe-batch-size` (desktop relies on CLI default 3).
11. e2e analog of hide-chrome: `#probeParallel` visible and **unchecked** (`test/desktop-electron.e2e.test.ts`).
12. `JobSupervisor.start` while `this.child` set throws “Một việc đang chạy” — one Chrome profile.
13. `assertSafeJobPaths` with `allowedProfileRoot` rejects a profile outside the desktop-owned chrome-profile dir (Chrome User Data already covered).

Track S compare / A/B:

14. `compare-track-s-ab.mjs`: control `affiliate` vs treatment `none` → `true→false (regression)` > 0 and no `TRIAL: PASS` (current test only covers the PASS / 0-regression path).
15. `track-s-ab.sh` also refuses a **treatment** out path under `design-full-10k` (control-only today).

## Build Status

- **Unit:** PASS (174/174)
- **Track S:** PASS (22/22)
- **Compile:** FAIL (33)
- **Coverage gate:** not configured
- **Desktop e2e:** not run (excluded from `npm test`)

## Critical Issues

1. **Compile is not a test gate.** Green Vitest can hide `Evidence`/`EarlyExitSignal` drift (`desktop-adapter`, `early-exit` already disagree with `tsc`).
2. **Parallel probe is result-tested, not isolation-tested.** Ethics cap 1..3 in-flight can regress without failing current tests.

## Recommendations

1. **High:** isolation tests 1–3 + 6–9 before treating Track S parallel as regression-proof.
2. **High:** pay TS5097 / fixture type debt so `npm run compile` can join CI.
3. **Medium:** e2e `#probeParallel` default OFF; JobSupervisor single-child; compare-script regression case.
4. **Medium:** add `vitest` coverage on `lib/` + `cli/scan.ts` + `desktop/build-scan-argv.ts`; fail under 80% lines on those.
5. **Low:** update `docs/07-test-plan.md` 44/44 → 174; export `parseArgs` for unit tests instead of `--help` spawn (~1s each).

## Unresolved Questions

- Whether this eval should run `npm run test:desktop:e2e` (prior phase-5: 10 pass / 1 skip).
- Whether directional Track S GATE (n=61) is accepted while golden live verify stays outside `npm test`.

## Verdict

**Tests PASS / compile FAIL.** Isolation of probe **hits** is covered; isolation of **concurrency, abort, default-OFF wiring, and single Chrome profile** needs the tests listed above.
