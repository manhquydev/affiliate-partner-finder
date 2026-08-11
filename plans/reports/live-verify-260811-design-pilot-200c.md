---
title: "Live verify — design-pilot-200c (headed + probe-incomplete fix)"
date: 2026-08-11
status: complete
---

# Live verify — 260811-1339 — design-pilot-200c

## Run
- Out: `out/design-pilot-200c`
- Cohort: same 200 companies as pilot-200 (`companies.json` reused)
- Flags: `--resume --headed-scan --accept-failures --concurrency 2 --delay-ms 1500`
- Commit: `6fd2d45` (probe incomplete → timeout/unknown)
- Ops: hung ~68 min on `designclothing.dk` (scan started early, never done); kill + resume exported 200/200

## Totals
| Metric | 200c | notes |
|--------|------|-------|
| completed | 200/200 | exported CSV/JSON |
| affiliate / PT / none / unknown | 18 / 36 / 82 / 64 | |
| load ok / blocked / timeout / error | 136 / 30 / 33 / 1 | |
| **ket_qua** true / false / unknown | **54 / 82 / 64** | |
| non-ok → false | **0** | floor held |
| blocked → none | **0** | |
| path-only affiliate | 4 | rofa, organizingidea, sightsee, interaction-design |

## Golden (`verify-golden.mjs`)
- Match: **6/13**
- Acceptance: **FAIL** — affiliate-high **2/4** (vecteezy + design-bestseller still blocked)
- Same CF pattern as pilot-200

## vs pilot-200 (ket_qua)
- 16 domains flipped
- Fix signal: several **false → unknown** (designcosmics, designfictives, designkix, designmyfabric, designnrank, designsolutionsny, sturdybydesign) — probe abort no longer confident negative
- Regressions: some **true → unknown** (CF/timeout/noise); a few **unknown → true** (brisach, designhandel, designventurez)

## Deliverables
- End-user: `out/design-pilot-200c/results.csv`
- Audit: `results.full.csv`, `results.json`, `results.jsonl`

## Next
1. Harden scan: abort `page.close`/`context.close` so one hung site cannot stall the batch for hours
2. Scan via persistent CF profile to lift golden affiliate-high (vecteezy, design-bestseller)
3. Optional: CSV `url_goi_y` + DeepSeek plan after floor
