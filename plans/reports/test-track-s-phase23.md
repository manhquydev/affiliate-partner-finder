---
type: tester
date: 2026-08-26
scope: track-s phase-02 + phase-03
plan: plans/260826-1909-cli-throughput-track-s/
command: npm test
---

# Test Report — Track S Phase 2–3

**Timestamp:** 2026-08-26  
**Role:** ak:test  
**Repo:** affiliate-partner-finder  
**Suite:** default Vitest (`vitest run` via `npm test`)  
**Excluded:** `test/desktop-electron.e2e.test.ts` (e2e config only)

## Summary

Full unit suite **PASS**. Phase 3 path-probe batch/inject tests are in the green count. Phase 2 `--profile-timing` has **no dedicated unit file**; CSV contract still holds via export tests.

## Test Results Overview

| Metric | Result |
|--------|--------|
| Command | `npm test` |
| Exit | 0 |
| Test files | **19 passed / 0 failed** |
| Tests | **158 passed / 0 failed / 0 skipped** |
| Suites | 48 |
| Duration | 1.66s (tests 808ms) |
| Coverage | N/A — no `test:coverage` script |

Phase 1 cook report was **156 passed / 19 files**. Delta **+2 tests**, same file count: both new cases live in `test/path-probe.test.ts`.

## Per-file

| File | Passed | Failed | Skipped |
|------|-------:|-------:|--------:|
| `test/classify.test.ts` | 30 | 0 | 0 |
| `test/close-quietly.test.ts` | 4 | 0 | 0 |
| `test/collect-pagination.test.ts` | 5 | 0 | 0 |
| `test/desktop-adapter.test.ts` | 34 | 0 | 0 |
| `test/desktop-eta.test.ts` | 9 | 0 | 0 |
| `test/detector-config.test.ts` | 4 | 0 | 0 |
| `test/detector.test.ts` | 12 | 0 | 0 |
| `test/early-exit.test.ts` | 4 | 0 | 0 |
| `test/export.test.ts` | 10 | 0 | 0 |
| `test/hide-chrome-window.test.ts` | 4 | 0 | 0 |
| `test/injectable.test.ts` | 1 | 0 | 0 |
| `test/labels.test.ts` | 3 | 0 | 0 |
| `test/lazy-settle-budget.test.ts` | 4 | 0 | 0 |
| `test/network-collector.test.ts` | 4 | 0 | 0 |
| `test/network-hosts.test.ts` | 10 | 0 | 0 |
| `test/path-probe.test.ts` | **8** | 0 | 0 |
| `test/release-gate.test.ts` | 4 | 0 | 0 |
| `test/run-engine.test.ts` | 5 | 0 | 0 |
| `test/virtual-display.test.ts` | 3 | 0 | 0 |
| **Total** | **158** | **0** | **0** |

## Failed Tests

None.

## Phase 2 — profile-timing vs suite

| Success criterion | Suite evidence | Status |
|-------------------|----------------|--------|
| `--profile-timing` in `--help` | Help string in `cli/index.ts`; **not asserted** by `npm test` | UNCOVERED |
| JSONL `timingsMs` on when flag on, absent when off | `cli/scan.ts` writes field when `profileTiming`; **no** `test/profile-timing.test.ts` | UNCOVERED |
| `toSimpleCSV` unchanged (no timings column) | `test/export.test.ts` — header `ten_cong_ty,website,ket_qua,huong_dan` | PASS |
| Analyzer P50/P95 | `scripts/analyze-track-s-timings.mjs` exists; **not executed** by `npm test` | UNCOVERED |

`ScanResult.timingsMs` is optional in `lib/types.ts`. Zero-overhead-when-off is a source claim (`mark()` / `if (profileTiming)`), not a test.

## Phase 3 — parallel path-probe vs suite

| Success criterion | Suite evidence | Status |
|-------------------|----------------|--------|
| Default sequential bit-identical on existing tests | 6 pre-existing `pathProbe()` cases still pass (3-arg default) | PASS |
| Parallel batch 3 same hits as sequential | `parallel batch 3 returns same hits as sequential` | PASS |
| Inject self-containment with `parallelBatch=3` | `parallel inject self-contained with batch arg` (`toString` rebuild) | PASS |
| `--probe-batch-size` >3 rejected or clamped to 3 | Clamp in `cli/index.ts` + `lib/path-probe.ts` (`Math.min(3, …)`); **no CLI unit test** | UNCOVERED |

No stop-on-hit tests added or needed; existing junk/soft-404 cases still probe listed paths.

## Coverage Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Lines | n/a | 80% | SKIP |
| Branches | n/a | 70% | SKIP |
| Functions | n/a | 80% | SKIP |

## Build Status

- **Unit suite:** PASS
- **E2E / live A/B:** not run (Phase 4)
- **Dependencies:** resolved (`npm test` started)

## Critical Issues

None from this run.

## Recommendations

1. **P1** Add `test/profile-timing.test.ts`: flag off omits `timingsMs`; flag on emits `{ goto, settle, detector, probe, total }`; CSV still 4 columns.
2. **P1** Assert `--probe-batch-size` clamp (0 / 99 / NaN → 1..3) and default `--probe-parallel` OFF (`probeParallelBatch === 1`).
3. **P2** Smoke `node scripts/analyze-track-s-timings.mjs` on a fixture JSONL.
4. **P2** Do not treat this green suite as the Phase 4 throughput/FN gate.

## Unresolved Questions

- Phase 2/3 plan files still `status: pending` while code + two path-probe tests exist — plan sync is out of this tester scope.
- Live 200-row `--profile-timing` baseline still reserved in `metrics-track-s-baseline.md`.

## Verdict

**PASS** — `npm test`: **158 passed, 0 failed, 0 skipped** (19 files).

Phase 3 unit bar for `pathProbe` default + batch-3 inject: **met**.  
Phase 2 timing/JSONL/analyzer: **not covered by this suite**.
