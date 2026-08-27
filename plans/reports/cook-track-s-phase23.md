# Cook — Track S Phase 2–3

**Status:** DONE  
**Date:** 2026-08-26  
**Tests:** 158 passed

## Phase 2 — profile-timing

- `lib/types.ts` — optional `timingsMs`
- `cli/scan.ts` — `--profile-timing` instrumentation
- `cli/index.ts` — flag + help
- `scripts/analyze-track-s-timings.mjs`

## Phase 3 — parallel path-probe

- `lib/path-probe.ts` — 4th arg `parallelBatch` (max 3)
- `cli/index.ts` — `--probe-parallel`, `--probe-batch-size`
- `test/path-probe.test.ts` — +2 tests (parallel parity + inject)

## Phase 4 prep

- `scripts/track-s-ab.sh` — seed + run both arms (long-running; not executed in cook)

## Next

Run on ops machine with Chrome profile:
```bash
bash scripts/track-s-ab.sh
# then write metrics-track-s-ab.md with GATE: PASS|FAIL
```
