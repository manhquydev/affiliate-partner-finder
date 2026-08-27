# Cook — Track S Phase 2

**Status:** DONE  
**Date:** 2026-08-26  
**Mode:** code (phase file)  
**Phase 3:** not started

## Brainstorm contract (reused)

| Field | Content |
|-------|---------|
| Outcome | `--profile-timing` writes `timingsMs` to JSONL/ScanResult; CSV end-user unchanged |
| Constraints | Default OFF; one branch when off; no ethics/classify change |
| Non-goals | Phase 3 `--probe-parallel`; desktop mirror; live cohort-200 baseline |
| Acceptance | Help flag; JSONL on/off; `toSimpleCSV` unchanged; analyzer P50/P95 |

## Deliverables

- `lib/types.ts` — optional `timingsMs?: { goto, settle, detector, probe, total }`
- `cli/profile-timing.ts` — `attachProfileTimings` (no `Date.now` when off)
- `cli/scan.ts` — phase timers + finally attach; budget-timeout rows also stamped
- `cli/index.ts` — `--profile-timing` help/parse/pass-through, default `false`
- `scripts/analyze-track-s-timings.mjs` — P50/P95 per phase
- `test/profile-timing.test.ts`
- README + `docs/06-data-schema.md` notes

## Success criteria

| Criterion | Evidence |
|-----------|----------|
| `--profile-timing` in `--help` | `test/profile-timing.test.ts` exec `tsx cli/index.ts --help` |
| JSONL `timingsMs` on / absent off | helper + `JSON.stringify` round-trip |
| `toSimpleCSV` unchanged | header still `ten_cong_ty,website,ket_qua,huong_dan` |
| Analyzer P50/P95 | fixture JSONL → `goto: n=3 p50=20 p95=30` … |

## Verify

```
npx vitest run test/profile-timing.test.ts test/export.test.ts  → 17 passed
npx vitest run                                                 → 20 files, 165 passed
```

Review (task `P2CodeReview`): **8/10**, spec PASS, no criticals. Applied W1 (budget-timeout timings), S1 (settle try/finally), S2/S3 comments.

## Not done (out of scope)

- Live baseline on cohort 200 — stub remains `plans/reports/metrics-track-s-baseline.md` (n=61 DIRECTIONAL; needs Chrome profile).
- Phase 3 parallel path-probe (sibling tree may already contain `--probe-parallel`; this cook did not complete or start that phase).

## Next

Phase 3 only when requested. Then Phase 4 A/B on ops with `--profile-timing` on both arms or neither.
