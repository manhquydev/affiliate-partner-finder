# Code review: Track S Phase 5

**Mode:** `ak:code-review` (working tree; Stage 1 spec + Stage 2 quality)  
**Date:** 2026-08-27  
**Plan:** `plans/260826-1909-cli-throughput-track-s/` phase 5 + isolation follow-up from `code-review-track-s-rerun.md`  
**Scope:** desktop `--probe-parallel` mirror (default OFF); `cli/scan.ts` / `cli/browser.ts` profile-page isolation; `plans/reports/metrics-track-s-ab.md` gate string.  
**Focus:** no default-ON path; no keepAlive tab-share at `--scan-profile --concurrency` 2..3.  
**Ignored:** n=200 production throughput claim; golden/CF Track B; `npm run compile` pre-existing desktop/lib errors.  
**Do not commit / do not push.**

## Verdict

**STATUS: PASS**

`metrics-track-s-ab.md` contains **`GATE: PASS (directional-throughput)`**. Profile isolation is restored (`keepAlive` stays blank; `openPage` is `context.newPage()`; `scanOneCli` always `closeQuietly(page)`). Desktop mirrors `--probe-parallel` as an **unchecked** checkbox and only emits the CLI flag when the box is checked.

Prior `REQUEST CHANGES` on keepAlive reuse (`code-review-track-s-rerun.md`) is **cleared in source**. Phase 5 may land.

## Verdict summary

| Area | Result |
|------|--------|
| `GATE: PASS (directional-throughput)` in metrics file | **PASS** (`plans/reports/metrics-track-s-ab.md:57`) |
| Profile isolation (`newPage` + close company page) | **PASS** |
| Desktop `--probe-parallel` default OFF | **PASS** (HTML + IPC + argv + unit tests) |
| Ethics `blocked≠none` / concurrency ≤3 / batch ≤3 | **PASS** (unchanged) |
| Isolation regression test | **GAP** (Important nit) |
| `docs/desktop-windows.md` lists new checkbox | **MISSING** (Nice) |
| Cook/CI `grep GATE: PASS` before desktop edits | **MISSING** (process; file currently would pass) |

## Gate file

Hard gate from `phase-05-desktop-mirror-flags.md`: do not start until `grep -q 'GATE: PASS' plans/reports/metrics-track-s-ab.md`.

Observed:

```text
plans/reports/metrics-track-s-ab.md:1  # DIRECTIONAL — cohort n<200
plans/reports/metrics-track-s-ab.md:10 Speedup: 37.6% (need ≥25%)
plans/reports/metrics-track-s-ab.md:16 Throughput ≥25% | PASS
plans/reports/metrics-track-s-ab.md:17 Golden FP=0 | FAIL (non-blocking directional)
plans/reports/metrics-track-s-ab.md:18 none@ok FN | PASS
plans/reports/metrics-track-s-ab.md:19 same-row blocked→none ethics | PASS
plans/reports/metrics-track-s-ab.md:20 true→false regression | PASS
plans/reports/metrics-track-s-ab.md:21 cross-domain finalUrl | PASS
plans/reports/metrics-track-s-ab.md:57 **GATE: PASS (directional-throughput)**
```

`scripts/finalize-track-s-ab.mjs:148-157` emits that exact label when `directional` and throughput checks pass; golden is non-blocking on n<200. Matches brainstorm contract `plans/reports/brainstorm-260827-track-s-status.md`. Not a production n=200 claim.

## Isolation (`cli/scan.ts` + `cli/browser.ts`)

Previous failure: `openPage → ({ page: keepAlive })` plus `if (session.mode !== 'profile') close`. `--scan-profile --concurrency 2` (A/B and desktop) stole tabs. 16/61 control + 10/61 treatment cross-domain landings.

Current contract (matches the rerun MUST-FIX):

| Check | Evidence | Result |
|-------|----------|--------|
| Comments match code | `cli/browser.ts:98-105` “shared context, new page per company”; “Caller must closeQuietly(page)” | **PASS** |
| keepAlive is blank, never scanned | `cli/browser.ts:142-148` `about:blank`; extras closed | **PASS** |
| `openPage` is a fresh page | `cli/browser.ts:153` `({ page: await context.newPage() })` — does **not** return `keepAlive` | **PASS** |
| Company page always closed | `cli/scan.ts:297-299` `finally { closeQuietly(page); closeQuietly(ownedContext) }` — **no** `mode === 'profile'` skip | **PASS** |
| Persistent context not closed per company | profile `openPage` returns `{ page }` only; `ownedContext` stays undefined; ephemeral still returns `{ page, context }` (`cli/browser.ts:169-173`) | **PASS** |
| Desktop uses this path | `desktop/main.ts:255` `scanProfile: true`; concurrency 2 or 3 (`app.js:529`, turbo checkbox **checked** by default) | **PASS** (isolation is load-bearing for GUI, not just A/B) |

No remnant of `page: keepAlive` or `mode !== 'profile'` skip-close under `cli/`.

**Not implemented (prior MUST-FIX #3, now Nice):** fail-closed if profile mode cannot supply `concurrency` distinct pages. With `newPage()` per company this is no longer the silent-share bug; a hang becomes that company’s timeout via `scanOneCli` catch (`cli/scan.ts:286-296`), not a shared tab.

**Gap:** still **zero** tests that `openPage()` returns distinct `Page`s or that `scanOneCli` cannot skip-close in profile mode. Recurrence would poison every desktop job (always `--scan-profile`, default concurrency 3). Does not fail this review because the source contract is restored and greppable; it is the highest remaining nit.

`remainingScanBudgetMs` thunk (`cli/scan.ts:127,150,193`) is still present; not an isolation issue; probe still clamped to the 120s company wall.

## Desktop `--probe-parallel` (default OFF)

End-to-end opt-in chain:

| Layer | Default OFF evidence |
|-------|----------------------|
| HTML | `desktop/renderer/index.html:169` `<input id="probeParallel" type="checkbox" />` — **no** `checked`. Sibling turbo `#concurrencyRow` **has** `checked`. |
| Renderer | `desktop/renderer/app.js:528` `Boolean($('probeParallel')?.checked)` on Start **and** Resume (`:565`, `:579`). Missing node → `false`. `localStorage` only stores Trustpilot query (`:30-39`), not this flag. |
| Preload | `desktop/preload.cjs:6` pass-through `desktop:start`. |
| IPC | `desktop/main.ts:262` `probeParallel: Boolean(opts.probeParallel)` — omitted/undefined → `false`. |
| Types | `desktop/types.ts:46-47` optional, documented default OFF. |
| Argv | `desktop/build-scan-argv.ts:68` `if (opts.probeParallel) args.push('--probe-parallel')` — same pattern as lazy-settle / network-evidence. |
| Supervisor | `desktop/job-supervisor.ts:103` `buildScanArgv({ ...opts, out, profile })` forwards the boolean. |
| CLI | `cli/index.ts:95` `probeParallel: false`; `:124` flag sets true; `:407` `probeParallelBatch: args.probeParallel ? args.probeBatchSize : 1`. |
| Pack | `desktop/electron-builder.yml:9` `desktop/**/*` includes `renderer/index.html`. Main loads `desktop/renderer/index.html` (`desktop/main.ts:66`). |

Vietnamese label: **Quét đường dẫn song song** (`index.html:171`). Hint states mặc định tắt.

No path found that emits `--probe-parallel` when the box is unchecked.

## Spec compliance (phase 5)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 5.1 | Do not start until metrics contains `GATE: PASS` | PASS | File has `GATE: PASS (directional-throughput)`; `grep -q 'GATE: PASS'` matches |
| 5.2 | Unchecked checkbox, Vietnamese label | PASS | `index.html:169-172` |
| 5.3 | Default OFF through CLI argv | PASS | `build-scan-argv.ts:68` + adapter tests |
| 5.4 | Modify `docs/desktop-windows.md` | MISSING | §Cách dùng still lists only “Dừng sớm / Kiểm tra mạng / Chờ tải linh hoạt” as default-off (`docs/desktop-windows.md:44`) |
| 5.5 | CI or cook script verifies PASS file | MISSING | No repo script greps the metrics file; current file would pass if one existed |
| 5.6 | e2e green | PASS (this review) | `npm run test:desktop:e2e` → 10 passed, 1 skipped (packaged linux smoke, no `dist-desktop/linux-unpacked`) |

Brainstorm acceptance (`GATE` string + checkbox + tests green) is met. Phase-file leftovers 5.4/5.5 are nits, not default-ON.

## Tests (this review)

```text
npx vitest run test/desktop-adapter.test.ts test/track-s-cli-args.test.ts \
  test/classify.test.ts test/path-probe.test.ts test/close-quietly.test.ts
# 5 files, 80 passed
# includes: buildScanArgv omits --probe-parallel by default; passes when enabled
#           CLI --help documents default OFF
#           classify 30/30 (blocked≠none)

npx vitest run --config vitest.e2e.config.ts
# 10 passed | 1 skipped (packaged binary absent)
```

e2e locks hide-chrome **checked** (`test/desktop-electron.e2e.test.ts:149-152`) but does **not** lock `#probeParallel` unchecked. Adapter tests cover argv, not the checkbox DOM.

## MUST-FIX

None for Phase 5 behavior, isolation, or the gate string.

## NICE

1. **Important:** regression lock that profile `openPage` is `context.newPage()` (or that `cli/scan.ts` has no profile skip-close). Desktop always `--scan-profile` at concurrency 2..3.
2. e2e (or a jsdom read of `index.html`) asserting `#probeParallel` exists and `checked === false`, same shape as hide-chrome.
3. `docs/desktop-windows.md` §4: add **Quét đường dẫn song song** to the default-off list.
4. README still documents `--profile-timing` only (`README.md:90`); `--probe-parallel` remains CLI-help-only (`cli/index.ts:65-66`). Prior phase 2–3 nit.
5. Optional fail-closed if `newPage()` cannot supply distinct in-flight pages.
6. Finalize `crossDomain` only inspects **treatment** ok rows (`finalize-track-s-ab.mjs:99-104`). Control contamination would not fail the gate. Current metrics claim treatment cross-domain PASS.

## Files reviewed

- Isolation: `cli/scan.ts`, `cli/browser.ts`
- Desktop: `desktop/renderer/index.html`, `desktop/renderer/app.js`, `desktop/preload.cjs`, `desktop/main.ts`, `desktop/types.ts`, `desktop/build-scan-argv.ts`, `desktop/job-supervisor.ts`, `desktop/electron-builder.yml`
- Gate: `plans/reports/metrics-track-s-ab.md`, `scripts/finalize-track-s-ab.mjs`, `scripts/track-s-ab.sh`
- Tests: `test/desktop-adapter.test.ts`, `test/track-s-cli-args.test.ts`, `test/desktop-electron.e2e.test.ts`, `test/classify.test.ts`
- Context: `cli/index.ts`, `docs/desktop-windows.md`, `README.md`, `plans/260826-1909-cli-throughput-track-s/{plan.md,phase-05-desktop-mirror-flags.md}`, `plans/reports/{brainstorm-260827-track-s-status.md,code-review-track-s-rerun.md,check-track-s-rerun.md}`

## Weakest link

No automated test would fail if keepAlive reuse returned. The source is correct today; desktop would be the first victim of a regression.

## STATUS: PASS
