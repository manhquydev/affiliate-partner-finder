---
type: scout
date: 2026-08-27
---

# Scout: CLI scan pipeline (probe-parallel)

## Summary

CLI scan is Playwright `goto(domcontentloaded)` → settle → in-page detector → same-origin `pathProbe` → `classify`. `--probe-parallel` only changes in-page fetch chunking (junk sequential, then `Promise.all` of 1..3). Track S A/B (n=61) got **37.6% wall-clock** (1098s → 685s) with **0 true→false**, but isolation is **not clean**: 4 paired verdict diffs, golden FP=0 FAIL. Sequential 90s abort **drops the entire probe** (`probe=undefined`), so parallel is not a timing-only treatment — it can keep hits the control arm never records.

## Relevant Files

- `cli/scan.ts` — per-company wall, probe try/catch, `probeIncomplete` → timeout not `none`
- `cli/browser.ts` — ephemeral vs `--scan-profile` session, settle 1200ms, `closeQuietly` 3s
- `lib/path-probe.ts` — junk baseline + batched `Promise.all`; inject-self-contained
- `lib/probe-batch.ts` — CLI `--probe-batch-size` clamp 1..3 (fallback 3)
- `cli/index.ts` — flag wiring, `pLimit(concurrency≤3)`, start-stagger, `probeParallelBatch`
- `cli/injectable.ts` — `fn.toString()` + `__name` strip for `page.evaluate`
- `lib/scan.ts` — extension scan; probe catch **without** `probeIncomplete`
- `lib/early-exit.ts` — skip probe on strong homepage/network (flag default OFF)
- `lib/classify.ts` — `loadStatus !== 'ok'` ⇒ never `none`
- `lib/config.ts` — `PROBE_PATHS` length **28**
- `test/path-probe.test.ts` — sequential vs batch-3 hit set; `toString()` inject (skips `toInjectableSource`)
- `plans/reports/metrics-track-s-ab.md` — directional gate PASS; golden/isolation not production-clean

## Bottlenecks

Per company, wall is stacked. Probe-parallel only attacks step 4.

| Stage | Bound | Default path |
|-------|--------|--------------|
| `page.goto` | `run.tabTimeoutMs` | 20s, `waitUntil: 'domcontentloaded'` |
| Settle | `DEFAULT_SETTLE_MS` | **1200ms fixed**; `--lazy-settle` still ≤1200ms, opt-in OFF |
| Detector | in-page `evaluateInjectable(runDetector)` | sync-ish; catch → `error` |
| Path-probe | `min(28×8s+8s, 90s, remaining 120s)` | sequential worst-case **232s** capped **90s**; parallel theoretical `8s + ceil(28/3)×8s ≈ 88s` if every fetch times out |
| Close | `closeQuietly` | ≤3s page + ≤3s context (ephemeral) |
| Retry | `maxRetries=2` | timeout/error reruns **full** goto+settle+probe |

**Probe budget is still sequential-shaped.** `cli/scan.ts` uses `paths.length * probeFetchTimeoutMs + probeFetchTimeoutMs` then clamps 90s. Parallel does not shrink the outer `withTimeout`. Speedup is “finish more/faster inside the same 90s”, not a new budget.

**Company-level concurrency (not probe):** `pLimit(2)` (max 3) + start-stagger `sleep(i * min(delayMs, 500))`. Stagger is **index-based**, not slot-based: company 60 waits **30s** before `resolve` even if a worker is idle. Identical on both A/B arms, so it inflates wall-clock and dilutes measured probe speedup.

**Browser cost:** ephemeral = `newContext`+`newPage` per company; `--scan-profile` (A/B treatment/control) reuses one persistent context (cheaper, weaker cookie isolation). Shared Chrome process; disconnect is fatal unless shutting down.

**Peak in-flight fetches:** concurrency 2 × batch 3 = **6** same-origin GETs plus navigations. Ethics clamp is per-site batch≤3, not global.

**A/B evidence** (`plans/reports/metrics-track-s-ab.md`): probe was the intended bottleneck; 37.6% ≥25% PASS. Gate ran **without** `--profile-timing`, so phase ms unmeasured. Blocked goldens (vecteezy, madeindesign, finnishdesignshop) are Track B / CF, not probe algo.

## Probe-parallel semantics

**Flags (default OFF):**

- `--probe-parallel` → `probeParallelBatch = clampProbeBatchSize` (default **3**)
- without flag → `probeParallelBatch = 1` (`--probe-batch-size` ignored)
- Desktop checkbox mirrors the flag only; no batch-size control
- Extension `lib/scan.ts` still injects **2 args** (`origin, cfg.paths`) → sequential default

**In-page algorithm** (`lib/path-probe.ts`):

```text
junk = timedFetch(/zzq-{ts}-{rand})     # always sequential; 8s abort
if junk === 200 → pathHits=[]           # soft-404; no path fetches
batch = clamp(parallelBatch, 1..3)
for chunk of paths size batch:
  Promise.all(probeOne)                 # no stop-on-hit
hit iff status ≠ junk AND status ∈ {200,301,302}
isStrong = /affiliat/.test(path)        # path string, not finalUrl
```

- `fetch(..., { redirect: 'follow' })` — allowlist 301/302 rarely observed after follow; `r.url` may be cross-origin.
- `Promise.all` preserves chunk input order; overall hit order ≈ `PROBE_PATHS` order minus misses.
- Junk `'err'` still probes (anti-hallucination: only junk **200** disables).
- Self-contained: no module imports; 4th arg safe for `evaluateInjectable` JSON args.

**Outer abort is all-or-nothing.** `withTimeout(evaluateInjectable(pathProbe, …), probeBudget)` on throw:

- `probe = undefined`, `probeIncomplete = true`
- **no prefix hits** — in-flight successes discarded
- sequential often hits 90s (phase-03 recall note); parallel often completes → **asymmetric evidence**, not bit-identical timing

**`withTimeout` does not abort** the `page.evaluate`. Work continues until `closeQuietly(page)` after `scanOnPage` returns (or 120s outer timeout).

## Isolation

### Already in CLI (vs naive throw)

| Mechanism | Where | Effect |
|-----------|--------|--------|
| Probe try/catch | `cli/scan.ts` `scanOnPage` | Detector evidence survives probe throw/CSP |
| `probeIncomplete` | same | Incomplete probe + no homepage/network signal + `det.ok` → `loadStatus='timeout'` → classify **unknown/blocked**, never `none` |
| Network snapshot before probe | same | `--early-exit` can skip on network-only platforms; probe traffic does not pollute skip decision |
| Observe-only network | `attachNetworkObservers` | No `page.route`; default OFF |
| Asset abort OFF | `newScanContext` | Parity with extension observation set |
| `closeQuietly` 3s race | `cli/browser.ts` | Close cannot hang the company forever |
| Profile keep-alive blank page | `launchScanSession` | Closing last Chrome window would kill persistent process (false disconnect) |
| Ephemeral fresh context | `openPage` | Cookie/storage isolation per company |
| Settle never stacked | `settleForScan` | Lazy **replaces** 1200ms; remaining scan budget clamped |
| Batch clamp in inject | `path-probe.ts` | Even if CLI passes 99, in-page max 3 |
| Extension 2-arg default | `lib/scan.ts` | Parallel cannot leak into MV3 without an explicit 4th arg |

### Isolation gaps / remaining fixes

1. **A/B not probe-only in evidence space.** Control 90s abort wipes all `pathHits`; treatment completing the same 90s keeps them. Explains quality drift even with 0 true→false. Fix: return **partial hits** on abort, or scale `probeBudget` with `ceil(n/batch)*timeout + junk`, or fail both arms if either probe is incomplete.

2. **Extension `lib/scan.ts` is weaker.** Probe catch → empty `pathHits` + still `det.loadStatus==='ok'` → path-only miss can classify **`none`**. CLI `probeIncomplete` is the ethics fix; extension does not have it.

3. **`--scan-profile` shares one context.** CF cookies persist (intended) but also localStorage/cookies across companies. A/B used this on both arms; not a confounder between arms, but not company-isolated.

4. **Orphan in-page fetches** after Node `withTimeout`. Extra load on target + possible listener work after classify.

5. **`cli/scan.ts` does not clamp `probeParallelBatch`.** Relies on CLI + in-page. Direct `scanOneCli({ probeParallelBatch: 99 })` still clamped in-page only.

6. **Inject test gap.** `test/path-probe.test.ts` rebuilds via `pathProbe.toString()`, not `toInjectableSource`. Parallel 4-arg is untested through the real Playwright eval path.

7. **No `probe-batch.ts` tests.** Clamp fallback 3 vs in-page default 1 is easy to confuse.

8. **Start-stagger + retries** are outside the probe flag; they belong in both arms but make “probe isolation” wall-clock impure.

## Risks

| Risk | Evidence | Impact |
|------|----------|--------|
| WAF / rate-limit from burst-3 | Phase-03 listed; A/B 4 paired diffs | Flaky unknown↔none; 99designs control `true` → treatment `unknown` |
| Parallel completes more paths | Phase-03 recall note; mohd.it golden `none`→`partner_trade` low | False positive vs sequential truncation, not vs ground truth |
| Golden FP=0 FAIL | metrics-track-s-ab.md | Directional gate only; **not** a production throughput claim (cohort n=61) |
| Cross-origin `finalUrl` after `redirect: 'follow'` | `timedFetch` | Hit on off-origin 200; `isStrong` ignores final host |
| Global fetch fan-out | concurrency×batch | Up to 6 probes; ethics text is per-site |
| `settleLazy` Node race | `Promise.race(evaluate, wall)` | Page JS may run after Node continues; leftover MutationObserver until page close |
| Retry amplification | timeout × (1+maxRetries) | Blocked sites dominate wall; Track B |
| Missing goldens | thorvalddesign.com, pazzodesign.it | Gate coverage 7/11 present of 13 |
| Desktop flag without batch size | `build-scan-argv.ts` | Always 3 when checked |

Paired diffs (not true→false):

| domain | control | treatment |
|--------|---------|-----------|
| 99designs.com | true (affiliate) | unknown |
| designkoti.com | unknown | false (none) |
| designpple.com | false (none) | unknown |
| learn.thedesignforchange.com | false (none) | unknown |

`none@ok` FN check PASS (no new path evidence on none@ok). Ethics blocked→none PASS. Cross-domain finalUrl check PASS (result-level, not implemented inside `pathProbe`).

## Recommendations

1. Treat `--probe-parallel` as **ship-optional, default OFF** until n≥200 with **partial-hit or complete-probe pairing**. Do not read 37.6% as production throughput.
2. If a second A/B: both arms `--profile-timing`; require `probeIncomplete=false` on paired rows before scoring verdict diffs; keep `--probe-parallel` as the only intentional delta.
3. Isolation fix worth the code: on probe `withTimeout`, keep whatever `pathHits` already landed **or** mark both arms incomplete. Current discard-all is the largest semantic confounder.
4. Port `probeIncomplete` to `lib/scan.ts` if extension path-probe can time out.
5. Do not add stop-on-hit (plan RT-S-02). Do not raise batch above 3.
6. Next throughput (after isolation): start-stagger by worker slot, not `i*500`; `--lazy-settle` as a **separate** A/B; Track B for blocked goldens. Algorithm change not indicated (`research-260827-track-s-probe-algorithm.md`).

## Unresolved Questions

- Which of the 4 paired diffs are 90s-truncation vs WAF vs load flake? Gate had no `timingsMs.probe`.
- Sequential arm: how often is `probeIncomplete` true at n=61 / n=200?
- Should `probeBudget` become `junkTimeout + ceil(paths/batch)*fetchTimeout` (still capped 90s)?
- Does `redirect: 'follow'` + off-origin `r.url` ever count as a pathHit in production JSONL?
- Extension: is path-probe abort in MV3 a real `none` risk, or does executeScript usually finish?
- `settleLazy` leftover observers: any classify impact, or only wasted CPU?
- Desktop: need `--probe-batch-size`, or is 3 the only supported treatment?
- n=200 production gate still unrun; directional PASS must not be restated as isolated throughput.

## Next Steps

- Quality track: golden-gate + paired-diff root cause with `--profile-timing` both arms.
- Perf track: only after incomplete-probe rows are excluded or partial hits are recorded.
- Do not change `pathProbe` algorithm for Phase 5 on this evidence.
