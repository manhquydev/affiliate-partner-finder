# Cook report: Phase 04 metrics (partial)

**Date:** 2026-08-13  
**Plan:** `plans/260813-0816-network-lazy-settle-quality-track-a/phase-04-tests-golden-metrics.md`  
**STATUS:** DONE_PARTIAL

## Delivered

| Item | Path / note |
|------|-------------|
| Baseline + A1–A7 freeze | `plans/reports/metrics-260813-track-a-baseline.md` |
| `none@ok` measurement recipe | Same file § Measurement recipe |
| Live-shard lock | Documented: **do not** enable `--lazy-settle` on cooling 10k |
| A3 HITL | Explicitly deferred (not collected) |

## Not in this cook (still open on phase-04)

- Golden / `network-hosts` unit expansion (depends on phase-1 matcher)
- `scripts/measure-track-a-sample.mjs` (docs-only recipe sufficient for now)
- Running the sample re-scan A/B

## Phase-05 confirmation

- [x] `plans/reports/ops-260813-track-b-access-runbook.md` exists (Track B ops checklist)
- Phase-05 todos marked done on that basis (docs-only; no live-shard reconfigure)

## DoD reminder

Track A ship = (A1∨A2∨A3) + A4+A5 + A6+A7. Never unknown%.
