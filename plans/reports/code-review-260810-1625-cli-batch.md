# Code Review — Local CLI batch scanner (accuracy floor)

**Date:** 2026-08-10 16:25 (+07)  
**Plan:** `plans/260810-1610-local-cli-batch-scanner-accuracy-floor/`  
**Reviewer:** code-reviewer (spawn-style)  
**Disposition: Request changes**

## Code Review Summary

### Scope
- **Files:** `cli/{index,scan,collect,browser}.ts`, `lib/{trustpilot-reader,early-exit,collect}.ts`, `tsconfig.json`, `package.json`, `test/early-exit.test.ts`, `README.md`
- **LOC:** ~802 (focus set)
- **Focus:** Pending implementation vs plan acceptance (a–h)
- **Scout findings:** Dependents of extract (`lib/collect.ts` + `cli/collect.ts`); CLI must not import chrome-bound modules; `pathProbe` is `async` → evaluate via `toString()`; resume/`companies.json` contract; CF null-after-retries; README fence break; smoke `out/smoke-auto` has JSONL but no CSV/JSON export artifact

### Overall Assessment
Core architecture matches the plan: shared `readTrustpilotSearch` / `runDetector` / `pathProbe` / `classify`, root `tsc` excludes `cli`, concurrency capped at 3, early-exit default OFF, no DeepSeek/LLM deps, detector/classify/export cores unchanged. Unit + compile gates are green. Two High defects violate phase-4 resume and CF-throw contracts; README regression and a few reliability gaps remain. Fix High items before Approve.

### Spec acceptance (a–h)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| (a) | Shared detector/classify via Playwright evaluate; never blocked→none | **PASS** | `cli/scan.ts:80–88,117–128` evaluate + classify with real `det.loadStatus`; timeout/error paths call `classify({ loadStatus })` (`:72–73,:85–87,:132–133`). `classify` row 1 (`lib/classify.ts:17–20`) unchanged. Live smoke rows: `loadStatus:blocked` → `verdict:unknown` / `confidence:blocked` (`out/smoke-auto/results.jsonl`). |
| (b) | companies.json + JSONL single-writer resume; no silent empty CF success | **PARTIAL** | Snapshot + fsync append + corrupt-line skip: `cli/index.ts:90–118,154–170,213–223`. CF throw when `challenged` visible: `cli/collect.ts:52–55,82–85`. **Gaps:** `--resume` without snapshot re-collects (`cli/index.ts:154–178`); prolonged CF → `readPage` returns `null` → empty exit without CF message (`cli/collect.ts:14–23,50–57`). |
| (c) | concurrency ≤3, early-exit default OFF | **PASS** | Clamp `Math.min(3,…)` (`cli/index.ts:69`); defaults `concurrency:2`, `earlyExit:false` (`:54–60`); flag opt-in (`:75`). |
| (d) | CSV columns unchanged (`lib/export`) | **PASS** | `lib/export.ts` not in diff; `CSV_COLUMNS` identical to HEAD. CLI calls `toCSV`/`toJSON` only (`cli/index.ts:8,255–256`). |
| (e) | Extension still works; root tsc excludes cli; no detector rule rewrite | **PASS** | `tsconfig.json:8` `"exclude": […, "cli"]`. `lib/detector.ts` / classify / path-probe / export / `DETECTOR_VERSION` untouched. Extension collect wired to shared reader (`lib/collect.ts:15,25`). CLI does not import `lib/scan|tab-utils|storage|run-engine`. |
| (f) | No DeepSeek/cloud LLM | **PASS** | No AI modules; `package.json` deps: playwright/tsx/p-limit/@types/node only. Phase 6 remains deferred. |
| (g) | No business-logic regression in touchpoints | **PASS** (extract fidelity) | Trustpilot mapping semantics preserved in `lib/trustpilot-reader.ts:18–70` (same fields/challenge titles/pagination). Classify/detector untouched; early-exit only behind CLI flag. |
| (h) | No new lint/type/build errors | **PASS** (project gates) | `npm test` 64/64; `npm run compile` exit 0. CLI intentionally outside root `tsc` (plan RT-2); runtime via `tsx`. |

### Async `pathProbe` + `evaluateInjectable` / `toString()`

**PASS (runtime verified).**

- `pathProbe` is `async function` (`lib/path-probe.ts:14–17`); `toString()` begins with `async function pathProbe…`.
- CLI builds expression `(${fn.toString()}).apply(null, ${JSON.stringify(args)})` (`cli/scan.ts:46–52`).
- Playwright `page.evaluate(string)` **awaits** the Promise: local probe returned `{"ok":true,"n":42}` for an async injectable mirrored from CLI.
- Sync `runDetector` path also fine via same helper.

No blocker on this specifically.

---

### Critical Issues
None that corrupt classify / invent companies / map blocked→none in current code paths.

### High Priority

1. **`--resume` does not require `companies.json` — can silently re-collect**  
   - Spec: phase-04 “If `--resume`: require `companies.json`… Do not call collect again.”  
   - Code: `cli/index.ts:154–178` — if `args.resume && !existsSync(companiesPath)` and `--query` is set, falls into collect and overwrites cohort.  
   - **Fix:** when `--resume`, if snapshot missing → exit ≠0 with clear error; never enter collect.

2. **Prolonged Trustpilot CF → `readPage` null loses CF throw**  
   - Spec: RT-7 / phase-03 “after retries still CF → throw”.  
   - Code: `cli/collect.ts:14–23` keeps `continue` on `challenged` then returns `null`; caller sets `lastChallenged = Boolean(res?.challenged)` → `false` on null (`:48`), then `break` without throw (`:50–57`). Upstream only prints “no companies” (`cli/index.ts:180–182`). Exit ≠0, but message violates “fail clear” / operators won’t know to pass CF in profile.  
   - **Fix:** have `readPage` return last challenged result or `{ challenged: true, units: [] }` after retries; or track `sawChallenge` across attempts and throw the existing CF error.

### Medium Priority

3. **README structure regression**  
   - `README.md:40–67`: CLI block closed the Test fence early; `## Ethics & giới hạn` now contains the old Test bash (`npm test` / `compile`), burying ethics / compile under the wrong heading.  
   - **Fix:** restore Test section (test + compile), keep CLI section separate, restore Ethics prose (or drop the incorrect heading).

4. **JSONL write-chain rejection poisons subsequent appends**  
   - `cli/index.ts:214–222`: `writeChain = writeChain.then(() => { append… })` with no `.catch`. One fail rejects the chain; later `enqueueWrite` hangs off a rejected promise.  
   - **Fix:** `.then(…, err => { log; throw/mark fatal })` or serialize with try/catch and set `writeFatal`.

5. **Disconnect abort skips CSV/JSON export**  
   - `cli/index.ts:247–250` returns before `:255–256`. Partial JSONL remains (resume OK) but no evidence CSV. Acceptable if documented; prefer export-what-you-have then exit 1.

6. **Live golden / export artifact gap (verification, not unit)**  
   - Companion test report: `out/smoke-auto` has JSONL + progress but **no** `results.csv`/`results.json`; sites blocked — cannot satisfy plan `verify-golden.mjs` live gate yet. Source *does* call `toCSV`/`toJSON` on success path — re-run a completing smoke and confirm artifacts land.

7. **`--delay-ms 0` allowed**  
   - Plan ethics suggest ≥1000; code `Math.max(0, …)` (`cli/index.ts:70`). Help text recommends ≥1000 — soft. Prefer clamp `Math.max(1000, …)` or warn when &lt;1000.

### Low Priority

8. Start-stagger `i * Math.min(delayMs, 500)` (`cli/index.ts:231`) grows without cap — late companies in large batches wait minutes before first navigation. Cap stagger (e.g. `min(i, concurrency) * …`).

9. CLI not typechecked by `npm run compile` (by design). Optional `tsc` project for `cli/` under tsx-compatible settings would catch regressions earlier; not required by plan RT-2.

### Edge Cases Found by Scout

| Finding | Risk | Notes |
|---------|------|-------|
| Shared `trustpilot-reader` consumers: extension `lib/collect.ts` + `cli/collect.ts` | OK | Chrome inject + Playwright evaluate; chrome-free body |
| `pathProbe` async + string evaluate | OK | Runtime await confirmed |
| Resume domain key = `company.domain` from snapshot | OK | Smoke domains consistent (`www.flinders.nl`) |
| `--resume` + missing snapshot + `--query` | **High** | Silent re-collect |
| CF → null after 4 attempts | **High** | Vague empty failure |
| `isTerminal` = any row with `verdict` | OK | Retries occur before write (`scanWithRetry`) |
| Fresh run reuses `--out` without `--resume` | Medium ops | Overwrites `companies.json`; appends JSONL — document |
| Early-exit mirrors classify row 2 only | OK | Default OFF; weak-only still probes |

### Positive Observations (risk calibration)
- Probe isolation mirrors extension (`cli/scan.ts:96–106` vs `lib/scan.ts:95–109`).
- Single-writer + `fsync` + atomic progress/companies writes address RT-4/RT-5.
- Asset abort left OFF (`cli/browser.ts:45–49`).
- `baseResult` + classify on failures keep CSV-safe shapes (RT-6).

### Recommended Actions
1. **Blocker:** Fail hard on `--resume` without `companies.json`; never collect on resume.  
2. **Blocker:** Preserve/throw CF after read retries (null path).  
3. Fix README Test / Ethics fence breakage.  
4. Harden `writeChain` error path; optionally export partial CSV on disconnect.  
5. Re-run short smoke through export; when network allows, `node test/verify-golden.mjs ./out/…/results.json`.

### Metrics
| Gate | Result |
|------|--------|
| `npm test` | PASS — 8 files, 64/64 |
| `npm run compile` | PASS |
| Async evaluate probe | PASS (Playwright local) |
| Live `verify-golden` | NOT RUN / insufficient smoke artifact |
| Type coverage (CLI under root tsc) | N/A (excluded) |
| Linting Issues | 0 new from compile/test |

### Unresolved Questions
- Was `out/smoke-auto` killed mid-export, or produced by an intermediate binary? Current `cli/index.ts` should write CSV/JSON on clean completion — confirm on next smoke.
- Should `--resume` allow optional `--query` only for progress metadata, or ignore query entirely? Spec implies snapshot is sole cohort source.

---

## Disposition

**Request changes** — fix High #1 (resume requires snapshot) and High #2 (CF null → clear throw) before Approve. Spec items (a)(c)(d)(e)(f)(g)(h) are met or met at unit-gate level; (b) needs the resume/CF fixes to fully pass.

## Post-fix (cook --auto) — 2026-08-10

Applied:
1. `--resume` without `companies.json` → exit 2, no re-collect (`cli/index.ts`)
2. Prolonged CF: `readPage` returns challenged empty → collect throws (`cli/collect.ts`)
3. Intentional `browser.close()` uses `shuttingDown` so disconnect is not fatal
4. Resume treats only `ok`/`blocked` as terminal; retries `timeout`/`error`
5. README Ethics/Test fence fixed; writeChain `.catch` logs failures

Re-verify: `npm test` 64/64, `compile` OK, resume+export smoke writes CSV/JSON.

**Updated disposition: Approve for MVP** (phases 1–5). Phase 6 DeepSeek deferred. Full live `verify-golden` still manual when scan observation matches extension (some sites `blocked` under automation here).
