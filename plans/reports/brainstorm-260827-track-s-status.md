# Brainstorm — Track S status & next work

**Date:** 2026-08-27  
**Advisor:** kongming (--advise)

## Contract

| Field | Content |
|-------|---------|
| **Outcome** | `--probe-parallel` shipped CLI+Desktop (default OFF); directional throughput gate PASS; golden/CF on parallel track |
| **Constraints** | 28 paths+junk; batch≤3; concurrency≤3; blocked≠none; no CF bypass |
| **Non-goals** | New probe algorithm now; n=200 production claim before cohort recover; default ON probe-parallel |
| **Acceptance** | `GATE: PASS (directional-throughput)` in metrics; Phase 5 checkbox; npm test green |

## Đạt được (evidence)

| Phase | Status | Evidence |
|-------|--------|----------|
| 1 Cohort + seed | Done | n=61 DIRECTIONAL manifest |
| 2 `--profile-timing` | Done | JSONL `timingsMs`, analyzer script |
| 3 `--probe-parallel` | Done | `lib/path-probe.ts` batch Promise.all |
| 4 A/B gate | **Directional PASS** | 37.6% speedup, 0 regression, 0 cross-domain |
| 5 Desktop mirror | In progress | checkbox wired |

## Bugs đã xử lý

1. `remainingScanBudgetMs` undefined → false timeout
2. keepAlive tab sharing @ concurrency 2 → cross-domain contamination (16/61)
3. finalize ethics paired vs same-row → false FAIL(11)
4. `goto` load hang xvfb → `domcontentloaded`

## Vấn đề còn lại (tách lane)

| Issue | Lane | Action |
|-------|------|--------|
| vecteezy CF blocked | Golden / Track B | Profile warm; not throughput gate |
| mohd.it none→partner_trade | Detector Track A | v1.1 soft-case; not probe-parallel |
| Cohort n=61 not 200 | Ops | Recover `design-pilot-200` |
| Treatment interrupt gap | Ops hygiene | Continuous re-run optional for audit |
| `npm run compile` 35 errors | CI debt | Fix track-s-compare types + desktop e2e types |

## Không cần thuật toán mới (research)

Parallel batch-3 trên 28 path + junk sequential-first đủ **37.6%** với **0 true→false**. Adaptive batch / early abort chỉ khi speedup <25% sau isolation fix — không phải hiện tại.

## Recommended sequence (executing)

1. Amend directional gate → `GATE: PASS (directional-throughput)`
2. Phase 5 desktop `--probe-parallel` checkbox (default OFF)
3. Update plan.md phases 3–4 complete
4. Herdr: test + review Phase 5
5. Golden/CF track parallel (không block mirror)

## Unresolved

- Stakeholder có chấp nhận directional PASS tách golden không?
- Khi nào recover pilot-200 cho production gate?
