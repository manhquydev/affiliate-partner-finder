---
type: tester
date: 2026-08-27
scope: live golden gate (docs/07) vs Track S A/B — separate from throughput
---

# Golden Gate Status

## Summary

Live golden gate is **FAIL**. Throughput gate is **PASS (directional)** and is a different lane.

`node test/verify-golden.mjs` on Track S A/B `results.json` (both arms, n=61): **7/11 present** of 13 golden; acceptance **FAIL** only `affiliate-high: 3/4`. Named misses: **vecteezy.com** (CF blocked → `unknown`) and **mohd.it** (`none` → `partner_trade/low`). Neither is a `--probe-parallel` regression — control and treatment verdicts match.

Unit golden (`test/fixtures/golden.ts` / classify table) is a third lane: it still encodes the 2026-08-10 capture, not this live run.

## Lane split (do not mix)

| Lane | Artifact | Result | Blocks |
|------|----------|--------|--------|
| Throughput (Track S) | `plans/reports/metrics-track-s-ab.md` | `GATE: PASS (directional-throughput)` — 37.6% wall-clock, n=61 | Ship `--probe-parallel` (default OFF) |
| Live golden (docs/07 §5) | `test/verify-golden.mjs` on `out/track-s-ab-*/results.json` | **FAIL** — affiliate-high 3/4 | Accuracy / Track B+A, **not** probe-parallel |
| Unit golden | `test/fixtures/golden.ts` via `npm test` | Owned by `test-audit.md`; fixtures still expect mohd.it=`none` on empty hits | Classify regression only |

Finalize labels the live script as `Golden FP=0 (treatment) | FAIL (non-blocking directional)`. That label is **wrong**: script failed on **affiliate-high FN** (vecteezy), not false-affiliate. mohd.it is a **verdict-matrix XX**, not a §5 false-affiliate.

## Test Results Overview

- **Command:** `node test/verify-golden.mjs <results.json>`
- **Treatment:** `out/track-s-ab-treatment/results.json` (n=61, detector 1.1.0) → exit 1
- **Control:** `out/track-s-ab-control/results.json` (n=61) → exit 1, **identical matrix**
- **Trial A/B:** `out/track-s-trial-*/results.json` — 0/13 golden present (not a golden run)
- **`docs/data/test-results.json`:** not a results array (`meta/targets/stats`). Script throws `results is not iterable`. Historical capture only.

### Matrix (treatment = control)

| Domain | expected | got | conf | load | match |
|--------|----------|-----|------|------|-------|
| vecteezy.com | affiliate | unknown | blocked | blocked | **XX** |
| nordicnest.se | affiliate | affiliate | high | ok | OK |
| designbyamor.com | affiliate | affiliate | high | ok | OK |
| design-bestseller.de | affiliate | affiliate | high | ok | OK |
| madeindesign.com | partner_trade | unknown | blocked | blocked | XX |
| williamwoodmirrors.co.uk | partner_trade | partner_trade | medium | ok | OK |
| ozdesignfurniture.com.au | partner_trade | partner_trade | low | ok | OK |
| namly.dk | none | none | high | ok | OK |
| finnishdesignshop.com | none | unknown | blocked | blocked | XX |
| thorvalddesign.com | none | (missing) | — | — | — |
| mohd.it | none | partner_trade | low | ok | **XX** |
| pazzodesign.it | none | (missing) | — | — | — |
| flinders.nl | unknown | unknown | blocked | blocked | OK |

**Present:** 11/13. **Missing (cohort, not detector):** `thorvalddesign.com`, `pazzodesign.it`.

### Acceptance (docs/07 §5)

| Rule | Result | Notes |
|------|--------|-------|
| 4/4 affiliate-high | **FAIL 3/4** | vecteezy only |
| 0 blocked→none | PASS | ethics holds |
| 0 non-ok→simple false | PASS | |
| 0 false-affiliate on 5 none-cases | PASS | mohd.it is `partner_trade`, not `affiliate` |
| affiliate evidenceUrl | PASS (script) | not evaluated for blocked vecteezy |

`--check-urls` not run.

## Findings

### vecteezy.com — CF / load (Track B)

- **Expected:** `affiliate/high` — 2026-08-10 capture: strong link “Affiliate Program” → `https://www.vecteezy.com/affiliates` + path `/affiliates` 200 (`docs/data/test-results.json`, `docs/07` §2).
- **Got (both arms):** `unknown` / `blocked`. `finalUrl=https://www.vecteezy.com/`. `totalLinks=2`, empty hits, `junkBaseline=null`. Treatment scanned 2026-08-27T01:58:32Z; control 2026-08-26T19:38:37Z.
- **Cause:** automation wall, not classify. Interstitial-sized DOM; detector never saw `/affiliates`. Same pattern as pilot-200 / 200c; 200d recovered design-bestseller via `--scan-profile` but **vecteezy stayed blocked**.
- **Not:** probe-parallel, path-probe, or weak-keyword. Identical on serial control.
- **Ethics:** blocked stays `unknown`. Correct. Do not score blocked as ranking/throughput failure.

### mohd.it — weak “trade” on `/en/` (Track A)

- **Expected:** `none/medium` — 2026-08-10: load OK, `finalUrl=https://www.mohd.it/en/`, no hits. Soft-case: locale redirect may hide IT affiliate (`docs/07` §2; `docs/10` v1.1).
- **Got (both arms):** `partner_trade/low`, load `ok`. `finalUrl=https://www.mohd.it/en/`. junk 404. 198 links. One **weak** hit: text “Trade & Professionals”, href `https://www.mohd.it/en/trade-and-professionals/`, `kw=["trade"]`, `isStrong=false`. No platform/path hits.
- **Cause:** `classify` row 5 (`lib/classify.ts`): single weak link → `partner_trade/low`. `WEAK_KEYWORDS` includes `trade` (`lib/config.ts`). Detector is doing its job on **new English B2B copy** that the 2026-08-10 none-capture did not have.
- **§5:** not a false-affiliate. Matrix mismatch vs frozen golden `none`.
- **Not:** probe-parallel. Same on both arms.
- **Tension with v1.1:** roadmap wanted native IT homepage to catch a possible missed **affiliate**. Live miss is the opposite direction (weak trade on `/en/`). Do not “fix” by forcing `none`.

### Other matrix XX (not named in dispatch; load, not detector)

- `madeindesign.com`: expected `partner_trade`, blocked → `unknown` (same CF class as vecteezy).
- `finnishdesignshop.com`: expected `none`, blocked → `unknown` (cannot prove none; ethics OK).

### Historical live golden (same script)

| Run | match | affiliate-high | notes |
|-----|-------|----------------|-------|
| 2026-08-10 capture | 13/13 manual | 4/4 | `docs/data/test-results.json` |
| design-pilot-200 | 6/13 | 2/4 | vecteezy + design-bestseller blocked |
| pilot-200c | 6/13 | 2/4 | same CF |
| pilot-200d | 7/13 | 3/4 | design-bestseller recovered; vecteezy still blocked |
| Track S A/B (this) | 7/11 present | 3/4 | vecteezy blocked; mohd.it partner_trade |

## Recommendations

1. **Critical — keep lanes split.** Do not reopen Track S / desktop `--probe-parallel` for this FAIL. Throughput already `GATE: PASS (directional-throughput)`.
2. **High — dedicated 13-site golden job.** Not the n=61 A/B cohort. Include missing `thorvalddesign.com` + `pazzodesign.it`. Persist `results.json` array. Re-run `node test/verify-golden.mjs out/.../results.json`.
3. **High — vecteezy (Track B):** headed `--scan-profile`, operator CF pass, `--resume`. Re-verify affiliate-high. No CF bypass. If still blocked, document exception — do not change expected verdict.
4. **High — mohd.it (Track A, docs/07 §6):** re-open `/en/trade-and-professionals/` by hand. If it is real B2B/trade: **update golden to `partner_trade/low`** + date, keep `none` fixtures only for empty-hit classify. If it is noise: tighten `trade` (e.g. require corroborating path) — that also hits ozdesign/williamwood; needs a precision test, not a one-off.
5. **Medium — relabel finalize.** `Golden FP=0` should not mean full `verify-golden.mjs`. Split: (a) false-affiliate on overlapping none-cases, (b) affiliate-high, (c) blocked→none. Directional n<200 may keep (b) non-blocking.
6. **Low — adapter:** `verify-golden.mjs` should reject/explain object-shaped `docs/data/test-results.json` instead of `not iterable`.

## Unresolved Questions

- Stakeholder still OK with directional throughput PASS while live golden FAIL? (`brainstorm-260827-track-s-status.md`)
- Is English “Trade & Professionals” enough to retire mohd.it as a none-case?
- When to recover `design-pilot-200` for a production golden+throughput claim (n=200)?
- Extension live export still deferred (`test-260826-extension-golden-manual.md`) — Chrome session, not this CLI gate.
