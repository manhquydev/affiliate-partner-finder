# Code review: Track S (`cli/` `lib/` `desktop/` `test/`)

**Mode:** `ak:code-review` working tree vs `HEAD` (`8e50bed`) + untracked Track S files  
**Date:** 2026-08-27  
**Plan:** `plans/260826-1909-cli-throughput-track-s/`  
**Scope:** `git diff HEAD -- cli/ lib/ desktop/ test/` plus untracked `cli/profile-timing.ts`, `lib/probe-batch.ts`, `test/{profile-timing,track-s-*}.test.ts`  
**Focus:** isolation, `--probe-parallel`, desktop mirror  
**Ignored:** n=200 production claim; golden/CF Track B; `npm run compile` debt; scripts/docs outside the four dirs  
**Do not commit / do not push.**

## Verdict

**STATUS: APPROVE_WITH_NITS**

`--probe-parallel` is default **OFF**, batch **clamped ≤3 inside the injected function**, **no stop-on-hit**, junk baseline still sequential-first. Desktop checkbox is **unchecked** and argv omits the flag unless ticked. Profile isolation is **already on HEAD** (`openPage` → `context.newPage()`; `scanOneCli` always `closeQuietly(page)`). Classify still refuses `none` unless `loadStatus==='ok'`.

The same `cli/scan.ts` hunk also switches `page.goto` from `waitUntil: 'load'` to `'domcontentloaded'` — a **plan non-goal**, not behind a flag, not isolated by the A/B. That is the only Important product-behavior extra. Isolation / probe-parallel / desktop-default-OFF do not need a rework.

## Verdict summary

| Area | Result |
|------|--------|
| Isolation (profile `newPage` + always close) | **PASS** (HEAD + working tree; not in this diff) |
| `--probe-parallel` default OFF, batch≤3, no stop-on-hit | **PASS** |
| Desktop mirror default OFF | **PASS** |
| Ethics `blocked≠none` / concurrency≤3 | **PASS** |
| Extension 2-arg inject (sequential) | **PASS** (`lib/scan.ts` unchanged) |
| Unconditional `domcontentloaded` | **Important** (spec non-goal) |
| Inject tests use `pathProbe.toString()` not `toInjectableSource` | **Important** (verification gap) |
| Isolation regression test | **Important** (verification gap) |

## Diff inventory

Modified vs HEAD:

| File | What changed |
|------|----------------|
| `cli/index.ts` | `--profile-timing`, `--probe-parallel`, `--probe-batch-size` |
| `cli/scan.ts` | timings, 4th probe arg, remaining probe budget, **`waitUntil` DCL** |
| `lib/path-probe.ts` | batched `Promise.all`, in-inject clamp 1..3 |
| `lib/types.ts` | optional `timingsMs` |
| `desktop/{build-scan-argv,main,types,renderer}` | opt-in checkbox → argv |
| `test/desktop-adapter.test.ts` | default omit / explicit pass |
| `test/path-probe.test.ts` | parallel vs seq + inject `toString()` |

Untracked (part of Track S, reviewed): `cli/profile-timing.ts`, `lib/probe-batch.ts`, `test/profile-timing.test.ts`, `test/track-s-cli-args.test.ts`, `test/track-s-ab-guard.test.ts`, plus cohort/compare tests not required for this focus.

**Not in the diff:** `cli/browser.ts` (isolation lives here on HEAD already).

---

## Stage 1 — Spec compliance

Plan contract (`plan.md`): `--profile-timing` + `--probe-parallel` (default OFF, batch≤3); 28 paths + junk; no stop-on-hit; concurrency≤3; `blocked≠none`; no CF bypass; desktop after `GATE: PASS`; **non-goals: `domcontentloaded` default, Track B, extension parity**.

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 2.1 | `--profile-timing` in `--help`, default OFF | PASS | `cli/index.ts:64,94,123` |
| 2.2 | `timingsMs` when on, absent when off; 120s wall rows included | PASS | `cli/scan.ts:255-263,287-295`; `cli/profile-timing.ts:21-28` |
| 2.3 | End-user CSV unchanged | PASS | `lib/export.ts:66-79`; `test/profile-timing.test.ts:68-80` |
| 2.5 | No extra `Date.now` in `attachProfileTimings` when off | PASS | `cli/profile-timing.ts:21`; unit spy |
| 3.1 | `--probe-parallel` → batch 3, default OFF | PASS | `cli/index.ts:95-96,124,407` |
| 3.2 | `--probe-batch-size` clamp 1..3 | PASS | `lib/probe-batch.ts:2-4`; in-page `lib/path-probe.ts:47` |
| 3.3 | Sequential default bit-identical | PASS | 4th arg default `1`; existing 3-arg tests still run |
| 3.6 | No stop-on-hit | PASS | both loops always walk remaining paths (`path-probe.ts:66-79`) |
| 3.7 | Extension 2-arg | PASS | `lib/scan.ts:101-104` `args: [origin, cfg.paths]` |
| 28 paths + junk first | PASS | `lib/config.ts:74-106` = 28; junk still sequential (`path-probe.ts:34-44`) |
| Ethics `blocked≠none` | PASS | `lib/classify.ts:18-21`; CLI non-ok still `classify({ loadStatus })` (`scan.ts:138-139,166-167`) |
| Concurrency ≤3 | PASS | `cli/index.ts:112`; desktop `MAX_CONCURRENCY=3` |
| 5.2–5.3 | Desktop checkbox unchecked; argv omit unless on | PASS | `index.html:169`; `build-scan-argv.ts:68` |
| Non-goal: DCL default | **EXTRA** | `cli/scan.ts:136` vs HEAD `waitUntil: 'load'` |
| 5.4 docs/desktop-windows.md | MISSING | out of `cli/lib/desktop/test` diff; still a phase-5 hole |
| Isolation regression test | MISSING | no test would fail if keepAlive reuse returned |
| Inject via `toInjectableSource` | WARN | tests reconstruct `pathProbe.toString()` |

Stage 1: **WARN** (one unjustified extra + verification holes). Requested Track S flags are present. Proceed to quality; do not treat DCL as in-scope of `--probe-parallel`.

---

## Isolation (focus)

Prior `REQUEST CHANGES` (`code-review-track-s-rerun.md`): `openPage → ({ page: keepAlive })` plus skip-close in profile mode. Adjacent cohort companies stole one Playwright tab.

**Current source (HEAD and working tree — `cli/browser.ts` not in this diff):**

| Check | Evidence | Result |
|-------|----------|--------|
| Comments match code | `cli/browser.ts:98-105` shared context, new page per company; caller closes | PASS |
| keepAlive is blank, never scanned | `:142-148` `about:blank`; extras closed | PASS |
| `openPage` is a fresh page | `:153` `{ page: await context.newPage() }` — does **not** return `keepAlive` | PASS |
| Company page always closed | `cli/scan.ts:297-299` `finally { closeQuietly(page); closeQuietly(ownedContext) }` — no profile skip | PASS |
| Persistent context not closed per company | profile returns `{ page }` only; `ownedContext` undefined; ephemeral still `{ page, context }` (`browser.ts:169-173`) | PASS |
| Desktop uses this path | `desktop/main.ts:255` `scanProfile: true`; concurrency 2 or 3 (`app.js:529`; `#concurrencyRow` **checked** by default, `index.html:141`) | PASS — isolation is load-bearing for GUI |

No remnant of `page: keepAlive` as the scan tab. Recurrence would poison every desktop job (always `--scan-profile`, default concurrency 3). **No test locks this.** See finding I2.

---

## `--probe-parallel` (focus)

| Check | Evidence | Result |
|-------|----------|--------|
| Default sequential | `probeParallel: false` (`cli/index.ts:95`); `probeParallelBatch: args.probeParallel ? args.probeBatchSize : 1` (`:407`) | PASS |
| CLI batch default 3, max 3 | `probeBatchSize: 3` (`:96`); `clampProbeBatchSize` (`lib/probe-batch.ts:2-4`) | PASS |
| In-page clamp even if CLI bypassed | `lib/path-probe.ts:47` `Math.max(1, Math.min(3, Math.trunc(parallelBatch) \|\| 1))` — literals, no module close-over | PASS |
| No stop-on-hit | `:66-79` both branches push every hit | PASS |
| Junk / soft-404 still first | `:34-44` sequential; `junk===200` returns `pathHits: []` before batching | PASS |
| 4th positional, default 1 | `:18-22`; CLI always passes 4 args (`cli/scan.ts:198-204`) | PASS |
| Inject self-contained (prod) | tsx `toString()` **contains** `__name`; `toInjectableSource` **strips** it; no `import`/`require(`; clamp + `Promise.all` remain (verified this review) | PASS (prod path) |
| Unit “inject” test | `test/path-probe.test.ts:58-77` `new Function(pathProbe.toString())` — **skips stripper** | GAP (I3) |
| Parallel vs seq unit | `:65-69` instant mock, sorted paths | weak (no abort/WAF interleave) |
| `withTimeout` does not abort in-page fetches | `cli/scan.ts:79-92` timer only; up to 3 fetches can outlive 90s until `closeQuietly` | NICE (N1) |
| Probe cap vs 120s wall | `remainingScanBudgetMs()` folded into `probeBudget` (`scan.ts:127,190-193`) | PASS (conservative) |
| Incomplete probe ≠ confident `none` | `scan.ts:237-238` remaps to `timeout` when no homepage signal | PASS |

`clampProbeBatchSize(undefined)` fallback **3** is the `--probe-parallel` default batch, not the sequential default. Sequential is `probeParallelBatch: 1` when the flag is off.

Same-origin fan-out at desktop turbo (concurrency 3) × batch 3 = **9** in-page fetches. Plan allows both caps separately. Not a lock break.

---

## Desktop mirror (focus)

End-to-end opt-in chain:

| Layer | Default OFF evidence |
|-------|----------------------|
| HTML | `desktop/renderer/index.html:169` `<input id="probeParallel" type="checkbox" />` — **no** `checked`. Sibling turbo `#concurrencyRow` **has** `checked`. |
| Renderer | `app.js:523-528` `Boolean($('probeParallel')?.checked)` on Start **and** Resume. Missing node → `false`. |
| Preload | `desktop/preload.cjs:6` pass-through `desktop:start` — does not strip the field. |
| IPC | `desktop/main.ts:262` `Boolean(opts.probeParallel)` — omitted/undefined → `false`. |
| Types | `desktop/types.ts:46-47` optional, documented default OFF. |
| Argv | `desktop/build-scan-argv.ts:68` `if (opts.probeParallel) args.push('--probe-parallel')`. |
| Supervisor | `desktop/job-supervisor.ts:103` `buildScanArgv({ ...opts, out, profile })`. |
| Tests | `test/desktop-adapter.test.ts:210-229` omit by default; pass when `probeParallel: true`. |

No path found that emits `--probe-parallel` when the box is unchecked.

Vietnamese label **Quét đường dẫn song song**; hint says mặc định tắt. Hint also says “Mở tối đa 3 đường dẫn” — those are same-origin `fetch`es, not extra Playwright pages (N2).

e2e locks `#hideChrome` checked (`test/desktop-electron.e2e.test.ts:149-152`) but **does not** lock `#probeParallel` unchecked (N3).

---

## Findings

Each finding: **severity**, **evidence**, **recommendation**.

### I1 — Important — Unconditional `waitUntil: 'domcontentloaded'`

**Severity:** Important (spec non-goal + quality semantics vs HEAD)

**Evidence:**

```diff
- await page.goto(websiteUrl, { waitUntil: 'load', timeout: run.tabTimeoutMs });
+ await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: run.tabTimeoutMs });
```

`cli/scan.ts:136`. Plan `plan.md` non-goals: **“domcontentloaded default”**. Not gated by `--probe-parallel` or any flag. A/B both arms inherit it, so it does **not** explain treatment vs control — it **does** change CLI/desktop vs `HEAD`.

Detector still runs after `settleForScan` (default 1200ms). Risk: slow SPA with `<5` anchors at that moment → `runDetector` `loadStatus: 'blocked'` (`lib/detector.ts:50-51`) → probe **skipped** (`cli/scan.ts:178`) → `unknown`, not `none`. Ethics lock holds; path-only recall can drop. Sites that never fire `load` no longer hang (brainstorm listed this as an xvfb hang fix).

**Recommendation:** Split from Track S. Either revert to `'load'`, or add an explicit opt-in (`--wait-until=domcontentloaded`) defaulting to HEAD `'load'`. Do not ship DCL as an invisible companion of `--probe-parallel`. If the hang fix must stay, document it as a separate contract change and re-baseline golden — not as probe-parallel.

### I2 — Important — No isolation regression test

**Severity:** Important (verification; desktop blast radius)

**Evidence:** `cli/browser.ts:153` and `cli/scan.ts:297-299` are correct **today**. `test/` has zero assertion that `openPage()` returns a page other than `keepAlive`, or that `scanOneCli` cannot skip-close in profile mode. Desktop always `--scan-profile` at concurrency 2..3 (`main.ts:255`, `index.html:141`, `app.js:529`). The previous keepAlive-share bug produced 16/61 + 10/61 cross-domain rows and would be silent here.

**Recommendation:** One unit/integration lock: two concurrent `openPage()` calls on a profile session yield distinct `Page` objects; `scan.ts` has no `mode === 'profile'` skip-close. Fail the suite if `openPage` returns the keepAlive tab.

### I3 — Important — Path-probe inject tests skip `toInjectableSource`

**Severity:** Important (inject path untested)

**Evidence:** `test/path-probe.test.ts:58-77` rebuilds with `new Function(pathProbe.toString())`. This review: tsx `pathProbe.toString()` **includes** `__name`; `toInjectableSource(pathProbe)` **does not**; clamp `Math.min(3` and `Promise.all` survive the stripper. Vitest’s transform often omits `__name`, so the test never sees the Playwright shape. A keep-names `toString()` would throw `__name is not defined` in `new Function`. Production CLI is safe **because** `evaluateInjectable` strips first (`cli/injectable.ts:33-40`).

**Recommendation:** Rebuild inject cases through `toInjectableSource` (assert no `__name` / `import` / `require(`; call `(origin, paths, 8000, 3)`). Optionally extend `test/injectable.test.ts` beyond `runDetector`.

### N1 — Nice — `withTimeout(0)` when company wall is exhausted

**Severity:** Nice

**Evidence:** `remainingScanBudgetMs()` can be `0`. `probeBudget = Math.min(..., remaining)` then `withTimeout(..., 0)` (`cli/scan.ts:79-92,190-207`). `setTimeout(0)` rejects next tick → `probeIncomplete` → timeout remap. Conservative, not an ethics hole. Almost always a truncated probe anyway.

**Recommendation:** If `remainingScanBudgetMs()===0`, skip `evaluateInjectable` and set `probeIncomplete` without `withTimeout(0)`.

### N2 — Nice — Desktop hint implies extra navigations

**Severity:** Nice (UX copy)

**Evidence:** `index.html:172` “Mở tối đa 3 đường dẫn affiliate cùng lúc”. Implementation is in-page `fetch` batches (`path-probe.ts:72-74`), junk still first, Playwright still one page per company.

**Recommendation:** Reword to same-origin path fetches, batch ≤3, default off.

### N3 — Nice — e2e does not lock `#probeParallel` unchecked

**Severity:** Nice

**Evidence:** hide-chrome has an e2e default-checked lock (`test/desktop-electron.e2e.test.ts:149-152`). `#probeParallel` has adapter argv tests only.

**Recommendation:** Same shape as hide-chrome: element exists, `isChecked()===false`.

### N4 — Nice — Parallel vs sequential equality test is instant-mock

**Severity:** Nice

**Evidence:** `test/path-probe.test.ts:65-69`. No abort, no 90s budget, no status-order interleave. Hit-set equality on a 2-path instant map cannot catch a stop-on-hit regression that only shows under timeout.

**Recommendation:** Slow mock + abort on path 2; assert path 3 still runs when batch=3.

### N5 — Nice — Phase 5 leftovers outside this diff

**Severity:** Nice (process / docs)

**Evidence:** Phase 5 required `docs/desktop-windows.md` + a cook/CI `grep GATE: PASS` before desktop edits. Neither is in `cli/lib/desktop/test`. `desktop/README.md:10` still lists Track A flags only (no probe-parallel).

**Recommendation:** Add the checkbox to desktop docs; optional grep gate. Not a default-ON bug.

---

## Ethics / locks (re-checked)

| Lock | Evidence | Result |
|------|----------|--------|
| `loadStatus!=='ok'` ⇒ never `none` | `lib/classify.ts:18-21`; `none` only `:50-51` | PASS |
| Unit: 0 blocked→none | `test/classify.test.ts` 30/30 this run | PASS |
| CLI does not probe blocked pages | `cli/scan.ts:178` `if (det.loadStatus === 'ok')` | PASS |
| Incomplete probe ≠ confident `none` | `scan.ts:237-238` | PASS |
| CSV non-ok ≠ `ket_qua=false` | `lib/export.ts:120-121` | PASS |
| No `page.route` / CF bypass in Track S | timers + `Promise.all` chunks only | PASS |
| Extension unchanged | `lib/scan.ts` 2-arg | PASS |

Parallel completing paths sequential truncates (RT-S-01) can still flip **timeout/unknown → none@ok**. That is **not** `blocked→none`.

---

## Test evidence (this review)

```text
npx vitest run test/path-probe.test.ts test/profile-timing.test.ts \
  test/track-s-cli-args.test.ts test/track-s-ab-guard.test.ts \
  test/desktop-adapter.test.ts test/classify.test.ts test/close-quietly.test.ts
# 7 files, 89 passed
# classify 30/30 (blocked≠none)
# desktop-adapter omits --probe-parallel by default
# CLI --help documents probe-parallel / profile-timing default OFF

npx tsx  # pathProbe.toString() has __name; toInjectableSource strips it;
         # clamp Math.min(3 and Promise.all remain
```

These suites cannot see shared-tab races or DCL-vs-load detector timing. Isolation and DCL remain source-read findings.

## Files reviewed

- Isolation: `cli/browser.ts`, `cli/scan.ts`
- Probe: `lib/path-probe.ts`, `lib/probe-batch.ts`, `cli/index.ts`, `cli/injectable.ts`, `lib/scan.ts` (extension arity)
- Timing: `cli/profile-timing.ts`, `lib/types.ts`
- Desktop: `desktop/renderer/index.html`, `desktop/renderer/app.js`, `desktop/preload.cjs`, `desktop/main.ts`, `desktop/types.ts`, `desktop/build-scan-argv.ts`, `desktop/job-supervisor.ts`
- Ethics context: `lib/classify.ts`, `lib/export.ts`, `lib/config.ts`, `lib/detector.ts`
- Tests: listed above + `test/desktop-electron.e2e.test.ts` (read)
- Plan: `plans/260826-1909-cli-throughput-track-s/{plan.md,phase-02,phase-03,phase-05}`

## Weakest link

I1 (DCL) is the only working-tree behavior change that can move verdicts **without** `--probe-parallel`. If golden/CF noise is being blamed on probe-parallel, check DCL+1.2s settle first. I2 is the highest **recurrence** risk: desktop will be the first victim if keepAlive reuse returns.

## MUST-FIX

None for isolation, probe-parallel default OFF, batch≤3, or desktop default OFF.

Before treating this working tree as “Track S only”:

1. **I1** — do not silently ship `domcontentloaded` as part of Track S; revert or flag it.
2. **I2 / I3** — add the two verification locks (isolation distinct pages; inject via `toInjectableSource`).

## STATUS: APPROVE_WITH_NITS
