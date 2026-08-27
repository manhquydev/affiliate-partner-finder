---
type: tester
date: 2026-08-27
scope: track-s phase-05 desktop mirror flags
plan: plans/260826-1909-cli-throughput-track-s/
command: npm test && npm run test:track-s && npm run test:desktop:e2e
---

# Test Report — 2026-08-27 — Track S Phase 5

**Role:** ak:test  
**Repo:** affiliate-partner-finder  
**Host:** Linux, DISPLAY set, `/usr/bin/google-chrome` present  
**Gate file:** `plans/reports/metrics-track-s-ab.md` contains `GATE: PASS (directional-throughput)`

## Summary

Unit, Track S, and desktop e2e are green. Desktop `--probe-parallel` checkbox is wired end-to-end (HTML default OFF → renderer `scanOptFlags` → IPC `desktop:start` → `JobSupervisor` → `buildScanArgv`). E2E does **not** assert `#probeParallel`. Docs still omit the new setting.

## Test Results Overview

| Command | Files | Tests | Passed | Failed | Skipped | Duration | Exit |
|---------|------:|------:|-------:|-------:|--------:|---------:|-----:|
| `npm test` (`vitest run`) | 24 | 174 | 174 | 0 | 0 | 1.86s | 0 |
| `npm run test:track-s` | 6 | 22 | 22 | 0 | 0 | 1.23s | 0 |
| `npm run test:desktop:e2e` | 1 | 11 | 10 | 0 | 1 | 3.01s | 0 |

- Vitest 2.1.9
- Coverage: not collected
- Failures: none
- vs `plans/reports/test-track-s-rerun.md` (172 tests): **+2** — both in `test/desktop-adapter.test.ts` (`--probe-parallel` omit/pass)

Skipped: `desktop packaged linux smoke > packaged AppImage/unpacked binary opens renderer` — `dist-desktop/linux-unpacked/` binary absent. `it.skipIf(!execPath)` is intentional.

## Per-file (`npm test`, 174)

| File | Pass |
|------|-----:|
| `test/classify.test.ts` | 30 |
| `test/desktop-adapter.test.ts` | **36** |
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

`npm test` excludes `test/desktop-electron.e2e.test.ts` (`vitest.config.ts`).

## Track S suite (22/22)

`package.json` `test:track-s` = six files only. Unchanged vs rerun report.

| File | Tests | Pass |
|------|------:|-----:|
| `test/path-probe.test.ts` | 8 | 8 |
| `test/profile-timing.test.ts` | 7 | 7 |
| `test/track-s-cli-args.test.ts` | 2 | 2 |
| `test/track-s-ab-guard.test.ts` | 2 | 2 |
| `test/track-s-cohort.test.ts` | 2 | 2 |
| `test/track-s-compare.test.ts` | 1 | 1 |

## Desktop e2e (10 pass / 1 skip)

Renderer suite: 10/10. No live Trustpilot scan — running-state case injects `desktop:status` via `app.evaluate`. Packaged linux smoke skipped (no unpacked binary).

Phase 5 plan said “e2e 9/9 green”. Current file has **11** cases (10 run + 1 skip). Count is stale; run is green.

**Not asserted:** `#probeParallel` visibility, default unchecked, or Start payload. Hide-chrome has an analog (`keeps hide-chrome toggle visible and checked by default`). Probe-parallel has none.

## ProbeParallel wiring (source)

| Layer | File | Evidence | Default OFF? |
|-------|------|----------|--------------|
| Checkbox | `desktop/renderer/index.html` | `<input id="probeParallel" type="checkbox" />` — no `checked`. Label **Quét đường dẫn song song**. Hint: max 3 paths, 28+junk, ~30–40% faster, mặc định tắt. | YES |
| Renderer | `desktop/renderer/app.js` | `scanOptFlags().probeParallel = Boolean($('probeParallel')?.checked)`. Spread into `startJob` on **Bắt đầu** and **Tiếp tục**. | YES (unchecked DOM) |
| Preload | `desktop/preload.cjs` | `startJob: (opts) => ipcRenderer.invoke('desktop:start', opts)` — opaque pass-through | n/a |
| Main IPC | `desktop/main.ts` | `probeParallel?: boolean` on `desktop:start`; `probeParallel: Boolean(opts.probeParallel)` into `supervisor.start` | YES (`Boolean(undefined)` → false) |
| Types | `desktop/types.ts` | `JobOptions.probeParallel?: boolean` — “Opt-in CLI `--probe-parallel`. Default OFF” | YES (optional) |
| Argv | `desktop/build-scan-argv.ts` | `if (opts.probeParallel) args.push('--probe-parallel')` — no `--probe-batch-size` (CLI default 3 when flag present) | YES (omit unless true) |
| Spawn | `desktop/job-supervisor.ts` | `buildScanArgv({ ...opts, out, profile })` | inherits |

Contrast: `#hideChrome` and `#concurrencyRow` have `checked`. `#earlyExit` / `#networkEvidence` / `#lazySettle` / `#probeParallel` do not.

## Unit coverage of desktop flag

`test/desktop-adapter.test.ts`:

- `buildScanArgv omits --probe-parallel by default` — `expect(args).not.toContain('--probe-parallel')`
- `buildScanArgv passes --probe-parallel when enabled` — `probeParallel: true` → flag present

Would fail if default flipped ON or the `if (opts.probeParallel)` line dropped.

Does **not** cover: renderer checkbox, IPC `Boolean()`, Start vs Resume both spreading `scanOptFlags`.

## Phase 5 success criteria

Plan: `plans/260826-1909-cli-throughput-track-s/phase-05-desktop-mirror-flags.md`

| Criterion | Evidence | Status |
|-----------|----------|--------|
| Hard gate: `GATE: PASS` in metrics file | `metrics-track-s-ab.md` line: `GATE: PASS (directional-throughput)` | PASS (directional; n=61) |
| Mirror `--probe-parallel` as unchecked checkbox | HTML + `scanOptFlags` + IPC + argv | PASS |
| Vietnamese label | `Quét đường dẫn song song` (plan said TBD) | PASS |
| Default OFF | no `checked`; argv omits unless true; unit test | PASS (source + unit; not e2e) |
| e2e 9/9 green | 10 passed, 1 skipped (packaged binary missing) | PASS (suite green; count stale; no probeParallel case) |
| Related: `docs/desktop-windows.md` | Settings list still “Dừng sớm / Kiểm tra mạng / Chờ tải linh hoạt” — no probe-parallel | GAP |
| Related: `desktop/README.md` | Track A flags only (`network-evidence`, `lazy-settle`, `early-exit`) | GAP |

## Failed Tests

None.

## Coverage Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Lines | n/a | 80% | SKIP |
| Branches | n/a | 70% | SKIP |
| Functions | n/a | 80% | SKIP |

## Build Status

- **Unit:** PASS
- **Track S:** PASS
- **Desktop e2e:** PASS (1 skip)
- **`npm run compile`:** not run (known 35-error CI debt in prior Track S reports)
- **Packaged linux-unpacked:** absent → packaged smoke skipped

## Critical Issues

None blocking the requested commands.

## Recommendations

1. **Medium:** e2e analog of hide-chrome — `#probeParallel` visible, **unchecked** by default. Closes the Phase 5 “Default OFF” hole the unit argv tests cannot see.
2. **Medium:** `docs/desktop-windows.md` §Cách dùng step 4 — add **Quét đường dẫn song song** to the default-off list. Phase 5 related-files named this doc.
3. **Low:** `desktop/README.md` Track A bullet should include `--probe-parallel`.
4. **Low:** plan “e2e 9/9” → 10 run + 1 skipIf packaged.

## Unresolved Questions

- Whether Phase 5 cook still owes the docs update (this tester did not edit docs).
- Whether directional GATE (n=61, golden FP non-blocking) is accepted as the desktop-edit unlock — file currently says PASS.

## Verdict

**PASS** — `npm test` 174/174; `test:track-s` 22/22; `test:desktop:e2e` 10 passed / 1 skipped.

Desktop probeParallel checkbox **is wired** (`index.html` → `app.js` → `main.ts` → `build-scan-argv.ts`). Default OFF in HTML and argv. Not proven by e2e. Docs not updated.
