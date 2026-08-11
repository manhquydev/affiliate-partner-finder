---
title: "Test Report — tool result verify + simple CSV"
date: 2026-08-10
status: complete
---

# Test Report — 260810-2340 — tool result verify

## Test Results Overview
- **Total**: 70 tests
- **Passed**: 70 | **Failed**: 0 | **Skipped**: 0
- **Duration**: ~1.8s
- **Compile**: PASS (`tsc --noEmit`)

## Coverage Metrics
| Metric | Value | Notes |
|--------|-------|-------|
| Unit suite | GREEN | vitest `test/*.ts` |
| Line coverage tooling | N/A | no `test:coverage` script yet |
| Critical path (export/classify) | Covered | +3 new `simpleHit` semantics tests |
| CLI live path | Manual gate | `verify-golden.mjs` |

## Live Golden Gate (`out/design-pilot-200/results.json`)
- **Verdict match**: 6/13
- **Acceptance**: FAIL — `affiliate-high: 2/4` (vecteezy + design-bestseller blocked)
- **non-ok → simple false**: 0 (PASS new rule)
- **blocked → none**: 0 (PASS)
- Path-only affiliates in pilot: `rofa.se`, `organizingidea.com`, `sightseedesign.com`, `interaction-design.org`

## Added Verification
1. `simpleHit` pathHits-only / platformHits-only → `true`
2. timeout/error → `unknown`
3. invariant affiliate|partner_trade ⇒ true when ok
4. `verify-golden.mjs` rejects non-ok rows exporting as simple `false`

## Critical Issues
1. Live CF blocks prevent golden PASS on headed automation without persistent scan profile
2. Probe soft-fail historically mapped empty pathHits + ok → false — mitigated in `cli/scan.ts` (incomplete probe → timeout when no homepage signals)

## Recommendations
1. **P0** Re-run pilot with probe-incomplete fix + persistent CF profile; require golden PASS before DeepSeek phase
2. **P1** Add CLI unit stubs for probe-abort / outer-budget discard
3. **P1** Extend simple CSV with `url_goi_y` for human triage
4. **P2** Add `npm run test:coverage` + threshold on `lib/`

## Unresolved
- `design-pilot-200b` still incomplete mid-run when last checked; regenerate simple CSV after finish
---

# Code Review — 260810-2340 — CLI + simple CSV

## Verdict
**request-changes → Critical mitigated in-tree (uncommitted); Important remain**

## Spec compliance
| Item | Status |
|------|--------|
| Simple CSV columns | PASS |
| Never blocked→false in exporter | PASS |
| Probe abort ≠ confident false | FIXED (pending commit) |
| Result semantics tests | IMPROVED (70 tests) |
| Live golden accuracy floor | FAIL (CF) |

## Findings (remaining)
### Important
1. Outer 120s budget can discard in-flight detector evidence (`cli/scan.ts` `withTimeout` around whole scan)
2. Customer CSV lacks strongest-evidence URL
3. `waitUntil: 'load'` + redirects `303/307/308` miss risk

### Minor
- `uniqueByDomain` redundancy; CLI excluded from root tsconfig

## Fix applied this session
- `cli/scan.ts`: probe incomplete + no homepage signals → `loadStatus=timeout`
- Extra export/golden gates for simple-hit contract
---

# Advise — 260810-2340 — product upgrade

## Confirmed requirements
- Deliverable: simple CSV `true|false|unknown` + human URL check
- Balance: unblock + reduce misses + overnight batch
- DeepSeek allowed for ambiguous cases
- Success metric: clear classification accuracy (golden + simpleHit gates)

## What to do (ordered)
1. **Accuracy floor before AI** — finish probe/budget fixes; scan with persistent profile; headed pilot until `verify-golden` PASS and non-ok→false=0
2. **Triage CSV v2** — add `url_goi_y` (strongestEvidence); sort true → unknown → false
3. **DeepSeek follow-up plan** — only on weak/ambiguous ok rows; never invent URLs; fail-open; JSON fields optional; gate on golden PASS
4. **Ops** — `--early-exit` opt-in after accuracy proven; overnight design crawl with `--accept-failures --resume`
5. **Do not** scale MV3 extension as bulk engine; keep CLI as engine

## What to avoid
- Treating AI labels as source of truth over detector evidence
- Collapsing unknown→false to “look cleaner”
- Shipping more UI before live golden/`ket_qua` contract is green

## Success checklist
- [ ] Unit 70+ green
- [ ] Live golden PASS on headed+profile pilot
- [ ] Probe-incomplete cannot produce false
- [ ] Human CSV has openable hint URL
- [ ] DeepSeek optional, evidence-bound, after floor
