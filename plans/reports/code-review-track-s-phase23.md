# Code review: Track S Phase 2–3

**Mode:** `ak:code-review` (working tree vs HEAD + untracked Track S files)  
**Date:** 2026-08-26  
**Plan:** `plans/260826-1909-cli-throughput-track-s/` phases 2–3  
**Scope:** `lib/path-probe.ts` parallel batch, `cli/scan.ts` profile timing, `cli/index.ts` flags, `cli/profile-timing.ts`, `scripts/{analyze-track-s-timings,seed-track-s-companies,build-track-s-cohort,track-s-ab}.*`, related types/docs/tests.  
**Focus:** ethics `blocked≠none`; inject safety of 4th-arg `pathProbe`.  
**Ignored:** Phase 4 live A/B, Phase 5 desktop mirror, production 10k jobs.  
**Do not commit / do not push.**

## Verdict summary

Flags default **OFF**. Site-scan concurrency still **1..3**. Probe fan-out **clamped ≤3 inside the injected function**. Classify + CLI still refuse `none` unless `loadStatus==='ok'`. Extension still **2-arg** inject (sequential).

**STATUS: APPROVE_WITH_NITS**

Phase 4 A/B may proceed. Fix nits before treating `--profile-timing` JSONL as complete (120s wall rows) or treating the path-probe `toString()` test as the Playwright inject path.

## Ethics / locks

Plan lock: *không phá ethics (`blocked≠none`, concurrency≤3, no CF bypass)*; probe-batch≤3; no stop-on-hit.

| Check | Evidence | Result |
|-------|----------|--------|
| `loadStatus!=='ok'` ⇒ never `none` | `lib/classify.ts:18-21` returns `{verdict:'unknown', confidence:'blocked'}`; `none` only at `:50-51` after ok + zero hits | **PASS** |
| Golden / unit: 0 blocked→none | `test/classify.test.ts:12-16,73-76,100-104` | **PASS** (30/30 this run) |
| CLI does not probe blocked pages | `cli/scan.ts:176` `if (det.loadStatus === 'ok')`; `lib/early-exit.ts:12` skip-probe also false when not ok | **PASS** |
| Incomplete probe ≠ confident `none` | `cli/scan.ts:225-232` remaps `ok` + `probeIncomplete` + no homepage signal → `timeout` → classify unknown | **PASS** |
| End-user CSV: non-ok ≠ `ket_qua=false` | `lib/export.ts:120-121` `simpleHit` → `unknown` when `loadStatus!=='ok'` | **PASS** |
| `--concurrency` still 1..3 | `cli/index.ts:51,79,110`; help ethics line `:68` | **PASS** |
| `--probe-parallel` default OFF; batch 1..3 | `cli/index.ts:92-94,122-123`; wire `:405` `probeParallel ? probeBatchSize : 1` | **PASS** |
| In-page batch cap even if CLI bypassed | `lib/path-probe.ts:47` `Math.max(1, Math.min(3, Math.trunc(parallelBatch) \|\| 1))` — literals, no module close-over | **PASS** |
| No stop-on-hit | Parallel/sequential loops always walk remaining paths (`lib/path-probe.ts:66-79`) | **PASS** |
| No CF bypass / `page.route` | Track S adds timers + `Promise.all` chunks only | **PASS** |
| A/B does not raise concurrency or touch 10k | `scripts/track-s-ab.sh` `--concurrency 2`; `deny_production` `design-full-10k` + `out/track-s-*`; treatment flag **only** `--probe-parallel` (no `--profile-timing`) | **PASS** |
| 28 paths + junk | `lib/config.ts:74-106` = 28 `PROBE_PATHS`; junk fetch still **sequential and first** (`lib/path-probe.ts:34-44`) | **PASS** |
| Extension unchanged (2-arg) | `lib/scan.ts:101-104` `args: [origin, cfg.paths]` → `parallelBatch` default 1 | **PASS** |

### `blocked≠none` vs unknown→none (not a lock break)

Parallel can finish the 90s probe budget that sequential truncates (`cli/scan.ts:188`). That can flip **timeout/unknown → none@ok** when all 28 paths + junk complete with no hits.

That is **not** `blocked→none`:

- Detector `blocked` never enters the probe branch.
- Soft-404 (`junk===200`) still returns `pathHits:[]` and classify only yields `none` if `loadStatus` stayed `ok`.
- Probe abort still forces `timeout` so CSV stays `unknown`, not `false`.

Plan RT-S-01 already accepted this as recall/speed, gated on **none@ok FN=0** + golden FP=0 — not on flip count. Do not treat extra `none@ok` as an ethics regression.

Same-origin fan-out at `--concurrency 3` × `--probe-batch-size 3` = **9** in-page fetches. Plan allows both caps separately. Not a lock violation; WAF risk stays on the Phase 4 sample, not 10k.

## Inject safety

`pathProbe` is Playwright-injected via `evaluateInjectable` (`cli/injectable.ts:33-40`): `(${toInjectableSource(fn)}).apply(null, ${JSON.stringify(args)})`.

| Check | Evidence | Result |
|-------|----------|--------|
| 4th positional, default 1 | `lib/path-probe.ts:18-22`; CLI always passes 4 args (`cli/scan.ts:192-198`) | **PASS** |
| Self-contained body | Type-only import (`lib/path-probe.ts:12`). tsx `toString()`: no `import`/`require`/`module`/`exports`; no TS annotations. Nested `timedFetch` / `probeOne` close over args/locals only | **PASS** |
| `__name` strip | Raw tsx `toString()` **contains** `__name`; `toInjectableSource` output **does not**. Stripper leaves no-op `timedFetch;` / `probeOne;` statements — valid JS | **PASS** (prod path) |
| Clamp inside inject | Stripped source still has `Math.min(3, Math.trunc(parallelBatch)||1)` | **PASS** |
| JSON-serializable args | `origin`, `cfg.paths`, `probeFetchTimeoutMs`, `probeParallelBatch` | **PASS** |
| 2-arg Chrome inject | Defaults keep sequential; MV3 `executeScript` arity unchanged | **PASS** |
| Unit “inject” test | `test/path-probe.test.ts:58-77` rebuilds with `new Function(pathProbe.toString())` — **skips** `toInjectableSource` | **GAP** |

Vitest 8/8 path-probe tests passed here; Vite’s transform often omits `__name`, so that test never sees the tsx/Playwright shape. A keep-names `toString()` would throw ` __name is not defined` in `new Function`. Production CLI is still safe **because** it strips first.

`test/injectable.test.ts` only strips `runDetector`, not `pathProbe`.

## Spec compliance (phases 2–3)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 2.1 | `--profile-timing` in `--help`, default OFF | PASS | `cli/index.ts:62,92,121`; `test/profile-timing.test.ts` exec `--help` |
| 2.2 | `timingsMs` on JSONL when on, absent when off | PASS with gap | `attachProfileTimings` in `scanOnPage` `finally` (`cli/scan.ts:250-257`) covers goto-timeout / detector-error. **`scanOneCli` 120s wall** (`cli/scan.ts:278-282`) returns `baseResult` **without** `timingsMs` |
| 2.3 | CSV unchanged | PASS | `toSimpleCSV` 4 columns; `toCSV` header unchanged (`test/profile-timing.test.ts`) |
| 2.4 | Analyzer P50/P95 | PASS | `scripts/analyze-track-s-timings.mjs`; vitest exec on fixture JSONL |
| 2.5 | Zero extra `Date.now` when off | PASS | `mark()` branches; `attachProfileTimings` no-ops |
| 3.1 | `--probe-parallel` → batch 3, default OFF | PASS | |
| 3.2 | `--probe-batch-size` clamp 1..3 | PASS (code) | No CLI unit test |
| 3.3 | Default sequential bit-identical | PASS | Pre-existing 6 tests still 3-arg |
| 3.4 | Parallel vs sequential same hits | PASS (weak) | Instant mock; sorted paths; no abort interleave |
| 3.5 | Inject self-containment batch=3 | WARN | See inject gap |
| 3.6 | No stop-on-hit | PASS | |
| 3.7 | Extension 2-arg | PASS | |
| scripts | seed + real `npm run scan` A/B (not preflight-only) | PASS vs Track A | `scripts/track-s-ab.sh:33,37` actually invokes scan |

## Bugs / regressions

| # | Finding | Sev |
|---|---------|-----|
| 1 | Path-probe inject tests do not run `toInjectableSource`. tsx `toString()` includes `__name`; Playwright path depends on the stripper. | **Important** (inject) |
| 2 | `scanOneCli` catch (120s `scanOne(domain)` wall) omits `timingsMs` even with `--profile-timing`. Hung companies — the rows Phase 2 exists to measure — drop out of the analyzer (`if (!t) continue`). | **Important** (timing) |
| 3 | README documents `--profile-timing` only. `--probe-parallel` / `--probe-batch-size` are CLI-only (`cli/index.ts:63-64`). | NICE (docs) |
| 4 | No unit test that `--probe-parallel` default stays batch=1, or that 0/99/NaN clamp to 1..3. | NICE |
| 5 | Outer `new URL(finalUrl)` catch (`cli/scan.ts:209-212`) does not stamp `tProbe`; rare, probe=0. | NICE |
| 6 | `withTimeout` still does not abort in-page `Promise.all` fetches. Pre-existing; parallel leaves up to 3 fetches running after 90s until `closeQuietly`. | NICE (ops) |
| 7 | Analyzer percentile is nearest-rank `floor(p/100*n)` not interpolated. Fine for ops; not a gate input. | OK |

No classify/export/detector rule changes. `DETECTOR_VERSION` still `1.1.0`. Desktop untouched (Phase 5 correctly gated).

## Test evidence (this review)

```text
npx vitest run test/path-probe.test.ts test/profile-timing.test.ts \
  test/classify.test.ts test/injectable.test.ts test/export.test.ts
# 5 files, 55 passed (path-probe 8, profile-timing 6, classify 30, injectable 1, export 10)
```

Plus tsx dump of `pathProbe.toString()` / `toInjectableSource(pathProbe)` (no import/require; `__name` stripped; batch clamp present).

## MUST-FIX

None for ethics `blocked≠none` or production inject (CLI uses `evaluateInjectable`).

Before trusting inject tests or timing JSONL as complete:

1. Rebuild inject cases through `toInjectableSource` (assert no `__name` / `import` / `require`; call with `(origin, paths, 8000, 3)`).
2. Call `attachProfileTimings` on the `scanOneCli` timeout `baseResult` (or equivalent) so 120s-wall rows keep `timingsMs`.

## NICE

1. README bullets for `--probe-parallel` (default OFF, batch≤3, no stop-on-hit, extension unchanged).
2. CLI parse tests: default batch 1; `--probe-parallel` → 3; `--probe-batch-size 99` → 3.
3. Optional abort of in-page probe when `withTimeout` fires.

## Files reviewed

- Modified: `lib/path-probe.ts`, `lib/types.ts`, `cli/scan.ts`, `cli/index.ts`, `test/path-probe.test.ts`, `README.md`, `docs/06-data-schema.md`
- Added: `cli/profile-timing.ts`, `test/profile-timing.test.ts`, `scripts/analyze-track-s-timings.mjs`, `scripts/seed-track-s-companies.mjs`, `scripts/build-track-s-cohort.mjs`, `scripts/track-s-ab.sh`
- Unchanged (ethics/inject context): `lib/classify.ts`, `lib/scan.ts`, `lib/export.ts`, `lib/config.ts`, `lib/early-exit.ts`, `cli/injectable.ts`, `test/classify.test.ts`

## STATUS: APPROVE_WITH_NITS
