# Code review: Track S rerun (post A/B)

**Mode:** independent `ak:code-review` of working-tree Track S vs HEAD + live A/B artifacts  
**Date:** 2026-08-27  
**Plan:** `plans/260826-1909-cli-throughput-track-s/`  
**Scope:** `cli/scan.ts` (`remainingScanBudgetMs`, profile page close), `cli/browser.ts` (`keepAlive` `openPage`), `lib/path-probe.ts` (`--probe-parallel`), `lib/probe-batch.ts`, `scripts/finalize-track-s-ab.mjs`  
**Focus:** `designmodo.com` affiliate→none, `webswiftusa.com` partner→none, A/B `blocked→none` ethics FAIL(11)  
**Do not commit / do not push.**

## Verdict

**STATUS: REQUEST CHANGES**

`--probe-parallel` is not the mechanism behind the two named true→false flips or the 11 ethics counts. The A/B harness (`--scan-profile --concurrency 2`) now shares one Playwright page across workers. Adjacent cohort companies steal each other's tab. Gate numbers from `out/track-s-ab-{control,treatment}` are not a probe-parallel measurement.

Same-row classify ethics still holds: **0/61** `loadStatus!=='ok' && verdict==='none'` in both arms. The reported ethics FAIL is a paired-counter bug plus contaminated `none@ok` rows.

Do not merge. Do not treat `metrics-track-s-ab.md` as a Phase 4 signal. Do not start Phase 5 desktop mirror.

## Verdict summary

| Area | Result |
|------|--------|
| `classify` same-row `blocked≠none` | PASS (code + both A/B JSONLs) |
| `--probe-parallel` inject clamp ≤3, no stop-on-hit, default OFF | PASS (code) |
| `remainingScanBudgetMs` probe cap | OK with nits |
| Profile `keepAlive` reuse + skip-close | **FAIL** under concurrency>1 |
| A/B isolation (`--probe-parallel` only) | **FAIL** |
| finalize ethics / none@ok FN / true→false gating | **FAIL** |
| Named regressions are probe-parallel FNs | **REJECTED** |

## Mechanism (load-bearing)

HEAD profile mode:

```text
openPage → context.newPage()     // one page per company
scanOneCli finally → closeQuietly(page)
```

Working tree:

```text
cli/browser.ts:154  openPage → ({ page: keepAlive })   // ONE page for the session
cli/scan.ts:299     if (session.mode !== 'profile') close  // never close that page
cli/index.ts:331    one shared ScanSession
cli/index.ts:344    pLimit(args.concurrency)           // default / A/B = 2
```

`scripts/track-s-ab.sh:44-53` (and Phase 4) require `--scan-profile --concurrency 2`. Two `scanOnPage` calls therefore `page.goto` / `page.evaluate` the same `Page`. `page.url()` after the race is the sibling's site. Results are attributed to the wrong company.

Stale comments still describe the old contract: `ScanSession` says "new page per company" and "Caller must closeQuietly(page)" (`cli/browser.ts:99-105`).

## Named regressions

Both true→false rows are adjacent-cohort tab collisions, not path-probe misses.

| Domain | Control | Treatment | Adjacent pair | Δ scannedAt |
|--------|---------|-----------|---------------|-------------|
| `designmodo.com` | `affiliate` on **`https://www.nordicnest.se/`** (nordicnest `/om-oss/affiliate/` link) | `none@ok` on `https://designmodo.com/` (156 links, `pathHits:[]`, junk 404) | cohort index 48/49 | 310 ms |
| `webswiftusa.com` | `partner_trade` on `https://webswiftusa.com/` (`/referral-program/` weak link) | `none@ok` on **`https://www.jmsplanet.com/`** (5 links) | cohort index 9/10 | 219 ms |

Control `designmodo` never scanned designmodo. Treatment `designmodo` did, and found no homepage/path signal. Calling that a `--probe-parallel` FN is wrong: the control "hit" is nordicnest's page mis-attributed.

Treatment `webswiftusa` never scanned webswiftusa. The real partner evidence from control is not comparable.

`--probe-parallel` is not in the causal chain for either flip. Parallel batch code (`lib/path-probe.ts:66-79`) still walks every path; junk baseline is still sequential-first (`:34-44`).

## Tab-theft census (A/B JSONL)

Rule used: `finalUrl` host is another cohort domain, and the two finish within a few seconds.

- Control: **16** cohort-cross rows. 15/16 Δ < 2.1 s (figma→dribbble 21 s is the outlier).
- Treatment: **10** cohort-cross rows. 9/10 Δ < 2.1 s (namly→lehtodesign 30 s).
- Every listed pair is **list-adjacent** in `companies.json` (gap ±1). Concurrency 2 always starts neighbors together (`cli/index.ts:394-398` stagger ≤500 ms).

Golden corruption from the same bug:

- `namly.dk` (golden `none`): treatment `finalUrl=https://lehtodesign.com/` still counts as none. `verify-golden` would accept a wrong-site none.
- `designbyamor.com` control: `finalUrl=https://www.design-bestseller.de/` — golden affiliate PASS on the sibling's page.
- `mohd.it` both arms: `finalUrl=https://finnishdesignshop.com/`, Δ=3–6 ms, both `blocked`.

A/B wall-clock 8.6% is not a probe-parallel speedup. Both arms are serialized on one tab plus navigation races.

## Ethics: blocked→none

### Same-row lock (product / `classify`)

`lib/classify.ts:18-21` still returns `{verdict:'unknown', confidence:'blocked'}` when `loadStatus!=='ok'`. `none` only at `:50-51` after `ok` + zero hits.

CLI still routes non-ok through `classify({ loadStatus })` (`cli/scan.ts:138-139,166-167,288-289`). Probe still skipped unless `det.loadStatus==='ok'` (`:178`). Incomplete probe with no homepage signal remaps to `timeout` (`:237-238`).

Live count on last-wins JSONL:

| Arm | n | same-row `blocked→none` |
|-----|---|-------------------------|
| control | 61 | **0** |
| treatment | 61 | **0** |

`npx vitest run test/classify.test.ts` — 30/30 pass this review.

### What finalize counted (11)

```js
// scripts/finalize-track-s-ab.mjs:65
if (c.loadStatus !== 'ok' && t.verdict === 'none') blockedToNone++;
```

This is **control not-ok → treatment none**, not "this row classified none while blocked".

All 11 treatment rows are `none` + `loadStatus==='ok'`. 3 of 11 are wrong-host:

| domain | control | treatment finalUrl |
|--------|---------|--------------------|
| lezzedesign.com | timeout | designguystudio.com |
| jerrycastillo.net | timeout | rebootrepairs.co.uk |
| www.risomdesign.com | timeout | design.filipccz.eu |

The other 8 are same-host `none@ok` after a control timeout. That can be (a) intended RT-S-01 "parallel finished the probe sequential truncated", or (b) control `goto` aborted because the sibling stole the tab. The artifact cannot tell them apart until pages are isolated.

**Do not treat FAIL(11) as a classify ethics regression.**

## finalize / gate math (independent of keepAlive)

Phase 4 table (`phase-04-ab-gate-cohort-200.md`):

- none→affiliate/partner **with path evidence is allowed**
- ethics = blocked→none=0
- compare script already tracks true→false

`scripts/finalize-track-s-ab.mjs` disagrees:

| Check | Implemented | Problem |
|-------|-------------|---------|
| `noneOkFn` | `c.none@ok && t.verdict!=='none'` (`:64`) | Counts designkoti `none@ok` → treatment `timeout/unknown`. That is not an affiliate FN and not a none→positive. Contradicts "none→positive with path evidence allowed". |
| `ethics` | paired control not-ok → treatment none (`:65`) | Not the classify lock. |
| `falseFlips` | counted (`:63`) **not in `checks`** (`:100-106`) | The two true→false rows cannot fail GATE. `compare-track-s-ab.mjs:99` fails TRIAL on falseFlips; finalize overwrites the gate. |
| `complete` | `control.size===treatment.size` | Both 61; cohort manifest n=61 directional. Does not require 200 or host-sane rows. |
| listing | diffs capped at 30; no ethics domain list | The 11 are not named in the metrics file. |

`loadMap` last-write-wins (`:21`) is acceptable for resume; not the bug here.

## `remainingScanBudgetMs` (`cli/scan.ts`)

```ts
const remainingScanBudgetMs = () => Math.max(0, scanBudgetMs - (Date.now() - scanStarted));
// settle
remainingScanBudgetMs: remainingScanBudgetMs(),
// probe
Math.min(paths*fetchTimeout + fetchTimeout, 90_000, remainingScanBudgetMs())
```

- **Preserves:** 120 s company wall; incomplete probe still cannot become confident `none`.
- **Improves vs HEAD:** HEAD always offered up to 90 s probe even when the outer 120 s wall had almost elapsed.
- **Risk:** `remaining===0` → `withTimeout(..., 0)` rejects on the next tick (`:79-92`). Almost always `probeIncomplete`. Conservative, not an ethics hole.
- **Not the A/B isolator:** both arms ship this. Under shared-tab, "remaining" includes time the sibling held `evaluate`/`goto`, so the number is noise.

No change required for ethics. Optional: if remaining < junk+one-path budget, skip probe and set `probeIncomplete` without `withTimeout(0)`.

## `--probe-parallel` / `probe-batch` (in isolation)

| Check | Evidence | Result |
|-------|----------|--------|
| Default sequential | `probeParallel: false` (`cli/index.ts:95`); batch passed only when flag on (`:407`) | PASS |
| Batch clamp 1..3 in inject | `lib/path-probe.ts:47` literals | PASS |
| CLI clamp | `lib/probe-batch.ts:2-4`; `--probe-batch-size` (`cli/index.ts:125`) | PASS |
| No stop-on-hit | both loops push every hit (`path-probe.ts:66-79`) | PASS |
| Extension 2-arg | `lib/scan.ts` unchanged (not in this diff) | PASS (prior) |
| Soft-404 first | junk fetch still sequential (`:34-44`) | PASS |
| Parallel vs seq unit | `test/path-probe.test.ts:65-69` instant mock, sorted paths | weak (no abort/WAF interleave) |
| Inject test | `new Function(pathProbe.toString())` skips `toInjectableSource` | still a gap (prior Important) |

`clampProbeBatchSize(undefined)` fallback **3** is correct for `--probe-parallel` default batch; it is not used as the sequential default.

This layer is not ready to credit or blame for the A/B quality result until page isolation is restored.

## Other nits (still true)

1. `scanOneCli` 120 s wall now stamps `timingsMs` (`cli/scan.ts:290-295`) — prior Important #2 is fixed.
2. Path-probe inject unit test still bypasses `toInjectableSource` (prior Important #1).
3. `withTimeout` still does not abort in-page `Promise.all` fetches. On a **shared** page this leaves sibling `goto` racing live fetches. Isolation fix removes the worst case; abort is still nice.
4. `ScanSession` comments lie about page-per-company and caller-close.

## Spec compliance (this slice)

| Req | Status |
|-----|--------|
| `--probe-parallel` default OFF, batch≤3 | PASS (code) |
| 28 paths + junk, no stop-on-hit | PASS |
| A/B isolates `--probe-parallel` only | **FAIL** — keepAlive reuse confounds both arms |
| Ethics `blocked≠none` | PASS in classify / same-row data; FAIL as reported by finalize |
| none@ok FN=0 / no new false | measurement broken; named flips are tab theft |
| Throughput ≥25% | FAIL (8.6%) and uninterpretable |
| Phase 5 desktop | **blocked** (no `GATE: PASS`) |

## MUST-FIX

1. **Restore page isolation in profile mode.** Keep a blank `keepAlive` tab so Chrome does not exit. `openPage` must return a **distinct** page per in-flight company (pool of size=`concurrency`, or `newPage()` again). Never hand the keepAlive tab to `scanOnPage`.
2. **Close company pages, never keepAlive.** Re-enable `closeQuietly(page)` for worker pages. If `newPage()` hangs under persistent Chrome + xvfb, fix that hang (blank page, timeout, retry) — do not serialize the world onto one tab.
3. **Fail closed:** if `mode==='profile'` and `openPage` cannot supply `concurrency` distinct pages, refuse to start (or force concurrency 1 and log it). Phase 4 must not silently share a tab.
4. **Rewrite finalize ethics** to same-row: `t.loadStatus!=='ok' && t.verdict==='none'`. List those domains.
5. **Put `falseFlips===0` in GATE `checks`.** Align `noneOkFn` with Phase 4: none@ok → program **without** new path/link/platform evidence is a fail; none→positive **with** evidence is allowed; none@ok → timeout/unknown is not an affiliate FN.
6. **Reject or quarantine rows** whose `finalUrl` host is another cohort domain. Fail the gate if any remain. Golden `none` on a foreign host must not PASS.
7. **Re-run A/B only after 1–3.** Discard current `out/track-s-ab-*` as a throughput/quality claim.

## NICE

1. Unit/integration test: two concurrent `scanOnPage` on a profile session must not observe each other's `page.url()`.
2. Rebuild path-probe inject tests through `toInjectableSource`.
3. Skip probe when `remainingScanBudgetMs()===0` instead of `withTimeout(0)`.
4. Fix `ScanSession` comments to match the real page-ownership contract.

## Test evidence (this review)

```text
npx vitest run test/classify.test.ts test/path-probe.test.ts \
  test/track-s-cli-args.test.ts test/track-s-compare.test.ts
# 4 files, 41 passed
```

These suites cannot see shared-tab races. JSONL host/adjacency/Δt analysis is the verification for findings 1–3.

## Files reviewed

- Modified: `cli/scan.ts`, `cli/browser.ts`, `lib/path-probe.ts`
- Added: `lib/probe-batch.ts`, `scripts/finalize-track-s-ab.mjs`
- Context: `cli/index.ts`, `lib/classify.ts`, `scripts/track-s-ab.sh`, `scripts/compare-track-s-ab.mjs`, `test/path-probe.test.ts`, `test/track-s-cli-args.test.ts`, `test/track-s-compare.test.ts`, `plans/260826-1909-cli-throughput-track-s/{plan.md,phase-03,phase-04}`
- Artifacts: `out/track-s-ab-control/results.jsonl`, `out/track-s-ab-treatment/results.jsonl`, `plans/reports/metrics-track-s-ab.md`

## Weakest link

`namly.dk`→`lehtodesign.com` (30 s) and both-arm pairs that look like "real redirects" are the softest contamination calls. They are still list-adjacent. The designmodo (310 ms, nordicnest evidence) and webswiftusa (219 ms, jmsplanet URL) cases are not soft.

## STATUS: REQUEST CHANGES
