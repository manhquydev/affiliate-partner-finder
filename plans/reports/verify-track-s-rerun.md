# Track S independent VERIFY

**Date:** 2026-08-27
**Sources used:** `out/track-s-ab-control/{results.jsonl,results.json,progress.json,companies.json}`, `out/track-s-ab-treatment/{…}`, `plans/260826-1909-cli-throughput-track-s/phase-04-ab-gate-cohort-200.md`, `test/verify-golden.mjs`, file mtimes + `scannedAt`.
**Not used as authority:** `plans/reports/metrics-track-s-ab.md` (compared only after recomputation).

**GATE: FAIL**

8.6% speedup + 19 diffs: **19 diffs reproduced exactly.** **8.6% is consistent with the run timer (967s / 884s) but is not uniquely recoverable from artifacts** (file clocks give 8.7%; `scannedAt` span gives 8.5%). Neither figure is near the ≥25% bar.

DIRECTIONAL: cohort manifest `n=61`, `target=200`, `directional=true`. Success criterion “both arms complete 200/200” is not met.

---

## 1. Arm inventory (recomputed)

| Arm | jsonl rows | results.json | progress | unique domains | `timingsMs` |
|-----|------------|--------------|----------|----------------|-------------|
| control | 61 | 61 | 61/61 | 61 | 0 |
| treatment | 61 | 61 | 61/61 | 61 | 0 |

- Paired on `domain`: **61 / 61**. Control-only: 0. Treatment-only: 0.
- Profile timing OFF on both arms (gate variable is `--probe-parallel` only). Matches phase-04.

Verdict / loadStatus:

| | control | treatment |
|--|---------|-----------|
| affiliate | 7 | 7 |
| partner_trade | 2 | 3 |
| none | 25 | 37 |
| unknown | 27 | 14 |
| load ok | 34 | 47 |
| timeout | 14 | 6 |
| blocked | 13 | 8 |

---

## 2. Wall-clock (independent)

Phase-04 throughput = treatment wall-clock vs control wall-clock, **not** probe ms.

| Clock | control | treatment | speedup |
|-------|---------|-----------|---------|
| `companies.json` → `progress.json` mtime (unix s) | 967s (`1787766077` → `1787767044`) | 883s (`1787767044` → `1787767927`) | **8.7%** |
| first→last `scannedAt` | 956.819s (`17:41:27.663Z` → `17:57:24.482Z`) | 875.107s (`17:57:32.700Z` → `18:12:07.807Z`) | **8.5%** |
| Published `date +%s` in metrics (not re-derived) | 967s | 884s | **8.6%** = `(967-884)/967` |

Treatment 884s vs file-span 883s is a 1s `date +%s` tick after `progress.json` write. Formula matches finalize: `toFixed(1)` on 8.583% → `8.6%`.

**Throughput check:** 8.5–8.7% ≱ 25% → **FAIL**.

---

## 3. Paired diffs (independent recompute)

Same pairing as `scripts/compare-track-s-ab.mjs`: last JSONL row per `domain`; `simpleHit` = ok+affiliate/partner_trade → true, ok+none → false, else unknown.

| Metric | n |
|--------|---|
| Verdict diffs (`c.verdict !== t.verdict`) | **19** |
| simpleHit diffs | **19** (same 19 domains) |
| loadStatus diffs | 18 |
| none→positive (ok false→true) | **0** |
| true→false regression (ok true→false) | **2** |
| none@ok → treatment not-none | **1** (`designkoti.com` → timeout/unknown) |
| none@ok → affiliate/partner with new pathHits | **0** |
| paired `c.loadStatus!==ok && t.verdict==='none'` | **11** |
| same-row `loadStatus!==ok && verdict==='none'` | **0 / 0** |

Official compare on the same files: `**Verdict diffs:** 19`, `**true→false (regression):** 2`, `**TRIAL: FAIL**`. Matches.

### 19 paired diffs

| domain | control | treatment | notes |
|--------|---------|-----------|-------|
| 1079designstudio.ie | unknown (timeout) | false (none/ok) | paired blocked→none |
| bartiancreative.com | unknown (timeout) | false (none/ok) | paired blocked→none |
| design-bestseller.de | true (affiliate/ok) | unknown (blocked) | golden high lost on treatment |
| design.filipccz.eu | unknown (timeout) | false (none/ok) | paired blocked→none |
| designguystudio.com | unknown (blocked) | false (none/ok) | paired blocked→none |
| designkoti.com | false (none/ok) | unknown (timeout) | finalize none@ok FN |
| designmodo.com | true (affiliate/ok) | false (none/ok) | **true→false**; control `finalUrl` was nordicnest.se |
| designsoutlet.co.uk | unknown (timeout) | false (none/ok) | paired blocked→none |
| envato.com | unknown (blocked) | true (affiliate/ok) | load recovered |
| figma.com | unknown (blocked) | true (affiliate/ok) | load recovered |
| jerrycastillo.net | unknown (timeout) | false (none/ok) | paired blocked→none |
| lezzedesign.com | unknown (timeout) | false (none/ok) | paired blocked→none |
| magna-design.dk | unknown (timeout) | false (none/ok) | paired blocked→none |
| ozdesignfurniture.com.au | unknown (blocked) | true (partner_trade/ok) | golden partner recovered |
| webswiftusa.com | true (partner_trade/ok) | false (none/ok) | **true→false** |
| williamwoodmirrors.co.uk | unknown (blocked) | true (partner_trade/ok) | path `/pages/trade` |
| www.jmsplanet.com | unknown (timeout) | false (none/ok) | paired blocked→none |
| www.rebootrepairs.co.uk | unknown (timeout) | false (none/ok) | paired blocked→none |
| www.risomdesign.com | unknown (timeout) | false (none/ok) | paired blocked→none |

---

## 4. `verify-golden.mjs` (both arms)

Command: `node test/verify-golden.mjs out/track-s-ab-{control,treatment}/results.json`

| | control | treatment |
|--|---------|-----------|
| exit | 1 | 1 |
| golden verdict match | 5/11 present (of 13) | 6/11 present (of 13) |
| affiliate-high | **3/4** (vecteezy blocked) | **2/4** (vecteezy + design-bestseller.de blocked) |
| missing golden | thorvalddesign.com, pazzodesign.it | same |
| false-affiliate on overlapping none-cases | **0** (namly.dk / finnishdesignshop.com / mohd.it) | **0** |
| same-row blocked→none | 0 (script would have failed) | 0 |

Phase-04 text: “Golden | `verify-golden.mjs` FP=0 on overlapping domains”.
- Narrow FP=0 on overlapping none-cases: **PASS** both arms.
- Script-level acceptance (docs/07 §5, what finalize runs): **FAIL** both arms (`affiliate-high`).

---

## 5. GATE vs phase-04

From `phase-04-ab-gate-cohort-200.md`:

| Check | Pass bar | Independent result | Verdict |
|-------|----------|--------------------|---------|
| Throughput | treatment ↑≥25% wall-clock | 8.5–8.7% (published 8.6%) | **FAIL** |
| Golden | verify-golden FP=0 on overlapping domains | FP=0; full script FAIL (affiliate-high) | **FAIL** if using the script finalize uses; FP-only would PASS |
| none@ok FN | paired 0 new false (none stays none on ok pages); none→affiliate/partner with new path evidence allowed | 0 none→positive; 1 none@ok left none via timeout (`designkoti.com`); 2 true→false | **FAIL** under finalize (`noneOkFn=1`). Allowed-path exception unused. |
| Ethics | blocked→none=0 | same-row 0; finalize paired 11 | **FAIL** under finalize pairing; same-row ethics PASS |
| Report | metrics file ends `GATE: PASS` or `GATE: FAIL` | published file ends `GATE: FAIL` | present; not a pass |

`GATE: PASS` only if **all** checks pass → **GATE: FAIL**.

Cohort n<200: DIRECTIONAL banner required. Gate still runs; not a production throughput claim. Still FAIL.

---

## 6. Are the headline numbers reproducible?

| Claim | Reproducible from JSONL / files? |
|-------|----------------------------------|
| 19 diffs | **Yes.** 19 verdict diffs, 19 simpleHit diffs, same domain list as the published table. |
| 8.6% speedup | **Partially.** `(967-884)/967 = 8.583% → 8.6%`. Control 967s matches `companies→progress`. Treatment **884s is not on disk** (mtime span 883s, `scannedAt` 875s). Within 1s of file clocks. **Not ≥25% under any clock.** |

---

## 7. Bottom line

Independent GATE on the checked-in A/B artifacts: **FAIL**.

Decisive: throughput ~8.6% vs ≥25%. Also: golden script FAIL both arms; 2 ok-page true→false flips; n=61 not 200.
