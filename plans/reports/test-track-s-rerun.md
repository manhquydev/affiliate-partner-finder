---
type: tester
date: 2026-08-27
scope: independent Track S rerun
command: npm test && npm run test:track-s
---

# Test Report — 2026-08-27 — Track S independent rerun

Independent run. Prior `plans/reports/*track-s*` files were not used as evidence.

## Test Results Overview

| Command | Files | Tests | Passed | Failed | Skipped | Duration | Exit |
|---------|------:|------:|-------:|-------:|--------:|---------:|-----:|
| `npm test` (`vitest run`) | 24 | 172 | 172 | 0 | 0 | 2.33s | 0 |
| `npm run test:track-s` | 6 | 22 | 22 | 0 | 0 | 1.40s | 0 |

- Combined wall: 4.74s
- Vitest: 2.1.9
- Host: Linux (e2e file excluded by `vitest.config.ts`; `describe.skipIf(win32)` in `release-gate.test.ts` did not skip)
- Coverage: not collected
- Failures: none
- Follow-up JSON reporter (`npx vitest run --reporter=json`): same 172/172, 0 pending, 0 todo

## Track S suite (22/22)

`package.json` `test:track-s` = these six files only.

| File | Tests | Pass | Fail | Notes |
|------|------:|-----:|-----:|-------|
| `test/path-probe.test.ts` | 8 | 8 | 0 | 13ms |
| `test/profile-timing.test.ts` | 7 | 7 | 0 | 815ms (help spawn) |
| `test/track-s-cli-args.test.ts` | 2 | 2 | 0 | 783ms (help spawn) |
| `test/track-s-ab-guard.test.ts` | 2 | 2 | 0 | exec `track-s-ab.sh` |
| `test/track-s-cohort.test.ts` | 2 | 2 | 0 | reads live manifest + seed script |
| `test/track-s-compare.test.ts` | 1 | 1 | 0 | exec `compare-track-s-ab.mjs` |
| **Total** | **22** | **22** | **0** | |

All 22 are also inside the 172 (`npm test` include = `test/**/*.test.ts` minus e2e).

## Full `npm test` per-file (172)

| File | Pass |
|------|-----:|
| `test/classify.test.ts` | 30 |
| `test/desktop-adapter.test.ts` | 34 |
| `test/detector.test.ts` | 12 |
| `test/export.test.ts` | 10 |
| `test/network-hosts.test.ts` | 10 |
| `test/desktop-eta.test.ts` | 9 |
| `test/path-probe.test.ts` | 8 |
| `test/profile-timing.test.ts` | 7 |
| `test/collect-pagination.test.ts` | 5 |
| `test/run-engine.test.ts` | 5 |
| `test/close-quietly.test.ts` | 4 |
| `test/detector-config.test.ts` | 4 |
| `test/early-exit.test.ts` | 4 |
| `test/hide-chrome-window.test.ts` | 4 |
| `test/lazy-settle-budget.test.ts` | 4 |
| `test/network-collector.test.ts` | 4 |
| `test/release-gate.test.ts` | 4 |
| `test/labels.test.ts` | 3 |
| `test/virtual-display.test.ts` | 3 |
| `test/track-s-ab-guard.test.ts` | 2 |
| `test/track-s-cli-args.test.ts` | 2 |
| `test/track-s-cohort.test.ts` | 2 |
| `test/injectable.test.ts` | 1 |
| `test/track-s-compare.test.ts` | 1 |

Excluded from `npm test`: `test/desktop-electron.e2e.test.ts`.

## Failed Tests

None.

## Spot-check

### 1. `test/path-probe.test.ts` — parallel parity

Contract under test (`lib/path-probe.ts`):

- Junk fetch first; `junk === 200` → no hits.
- Hit iff `status !== junk && status ∈ {200,301,302}`.
- `parallelBatch` clamped `1..3`. Sequential `for` vs `Promise.all` chunks.

Parity test (lines 65–70):

```ts
const seq = await pathProbe(ORIGIN, ['/affiliate', '/partner'], 8000, 1);
const par = await pathProbe(ORIGIN, ['/affiliate', '/partner'], 8000, 3);
expect(par.pathHits.map((h) => h.path).sort())
  .toEqual(seq.pathHits.map((h) => h.path).sort());
```

| Check | Result |
|-------|--------|
| Calls real `pathProbe` twice | yes |
| Would fail if parallel dropped a hit | yes |
| Instant mock `fetch` (no delay / abort) | yes — race/order untested |
| Asserts paths only, not status/`isStrong`/`finalUrl` | yes |
| 2 paths, not 28 `PROBE_PATHS` | yes (`lib/config.ts` has 28) |
| 301/302 hit cases | **missing** (impl accepts them) |
| Batch clamp `99 → 3` inside `pathProbe` | **missing** (CLI clamp tested separately) |

Sibling tests in the same file *are* real: soft-404, same-status-not-hit, weak `/pages/trade`, junk throw → `'err'`, `toString()` reconstruct with batch=3.

**Verdict:** parity assertion is real, not tautological. Narrow. Does not prove parallel ≡ sequential under timeouts or the full 28-path list.

### 2. `test/profile-timing.test.ts`

| Case | What it actually hits | Gap |
|------|----------------------|-----|
| flag on writes `timingsMs.total = now - startedAt` | `attachProfileTimings` | injectable `now`; does not force `Date.now` when on |
| flag off leaves field absent | helper no-op | — |
| flag off does not call `Date.now` | `vi.spyOn(Date, 'now')` | does not prove `cli/scan.ts` `mark()` branch |
| JSONL round-trip | `JSON.stringify` | not a scan write |
| `toSimpleCSV` / `toCSV` omit timings | real exporters | — |
| `--help` documents `--profile-timing` default OFF | `tsx cli/index.ts --help` | help text ≠ scan wiring |
| analyzer P50/P95 | exec `analyze-track-s-timings.mjs` on 3 timed + 1 untimed rows | nearest-rank formula locked to this n=3 fixture |

`cli/scan.ts` *does* call `attachProfileTimings` in `scanOnPage` `finally` and on the `scanOneCli` 120s-wall catch. **No test covers that wiring.**

**Verdict:** helper + CSV + analyzer + help are honest. Not a scan-integration suite.

### 3. `test/track-s-compare.test.ts`

One case: control `a.com=none`, `b.com=affiliate`; treatment `a.com=affiliate`, `b.com=affiliate` (faster probe). Exec `scripts/compare-track-s-ab.mjs`.

Asserts:

- `**Verdict diffs:** 1`
- `**true→false (regression):** 0`
- `/TRIAL: PASS/`

Would catch inverted PASS/FAIL or counting none→positive as regression.

Does **not** assert:

- `TRIAL: FAIL` when `true → false`
- `none→positive` count
- probe-ms delta lines
- `--out` write
- unpaired domains / bad JSONL / `loadStatus !== ok`

**Verdict:** real script, half the gate. PASS path only.

## Other Track S files (suite trust, not the requested trio)

- `track-s-ab-guard.test.ts`: exec real `scripts/track-s-ab.sh`; refuses `design-full-10k` and non-`out/track-s-*`. Honest. Does not run a scan.
- `track-s-cli-args.test.ts`: `clampProbeBatchSize(0/99/NaN/2)` is a real unit; help regex is string-only.
- `track-s-cohort.test.ts`: reads `plans/reports/track-s-benchmark-cohort-200.json` and seeds via script. Asserts `length > 0` and string `domain`/`name`/`trustpilotUrl` only.

**Manifest vs filename (this run):** file `n=61`, `target=200`, `directional=true`, `companies.length=61`. Every row has `domain,name,reviews,trustScore,trustpilotUrl`. Test would pass on a 1-row fixture. Filename `*-200.json` is not enforced.

## Coverage Metrics

Not measured. Not claimed.

## Build Status

Not run. User scoped this to the two test commands.

## Critical Issues

None blocking the unit suite (0 failures).

## Trust verdict

**Trustworthy as a unit/script contract suite. Not trustworthy as proof that Track S A/B, live scan, or a 200-company cohort is done.**

Reasons it *is* trustworthy at the unit layer:

- Independent `npm test` = 172/172; `npm run test:track-s` = 22/22; 0 fail / 0 skip / 0 todo.
- Tests call real modules and scripts (`pathProbe`, `attachProfileTimings`, `toCSV`, `compare-track-s-ab.mjs`, `track-s-ab.sh`, seed script). Not `expect(true)`.
- Parallel-parity and TRIAL PASS cases would fail if those contracts inverted.

Reasons it is *not* a Track S completion certificate:

1. Compare suite has no regression FAIL case.
2. Parallel parity uses instant mocks and 2 paths, not 28.
3. No test that `cli/scan.ts` passes `probeParallelBatch` or stamps `timingsMs` on a real/timeout scan.
4. Cohort test does not pin 200; on-disk manifest is 61 / target 200.
5. Help-text tests do not prove flag behavior.

Green here means: the 22 Track S unit tests still pass on this tree. It does not mean Phase 4 A/B gate or a 200-row cohort.

## Recommendations

1. **High:** add compare cases: `true→false` → `TRIAL: FAIL`; assert `none→positive`.
2. **High:** pin cohort `companies.length` (and/or `n`) to the intended size, or stop calling the fixture `*-200` while `n=61`.
3. **Medium:** delayed-fetch parallel parity (abort + 301/302 + >3 paths).
4. **Medium:** one parse/wire test: `--probe-parallel` → `probeParallelBatch=3`; `--profile-timing` on the 120s-wall `baseResult`.

## Unresolved Questions

- Whether Phase 4 still treats n=61 directional as acceptable (out of this TEST scope).
- Whether inject path (`toInjectableSource`) is covered anywhere other than `pathProbe.toString()` (injectable suite is 1 test, not in `test:track-s`).
