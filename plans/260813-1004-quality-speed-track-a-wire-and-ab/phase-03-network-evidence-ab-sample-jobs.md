---
phase: 3
title: "Network evidence A/B sample jobs"
status: pending
priority: P1
effort: "4-8h"
dependencies: [1, 2]
---

# Phase 3: Network evidence A/B sample jobs

## Overview

Run **control** (no Track A flags) and **treatment** (`--network-evidence` only) scans on the sample domains into **new** `--out` dirs. Concurrency ≤2. Do **not** pass `--lazy-settle`. Do **not** touch design-full-10k shard argv.

## Requirements

- Functional: `out/track-a-ab-control/` and `out/track-a-ab-network/` (or similar)
- Functional: Same sample domain list / companies input for both arms
- Functional: Treatment argv includes `--network-evidence`; control does not
- Non-functional: concurrency≤2; delay-ms≥1000; accept-failures; separate profiles under cache
- Hard rule: never add flags to `design-full-10k-shards/shard-*`

## Architecture

```text
sample domains → temp companies.json
  ├─ control:  npm run scan -- --out out/track-a-ab-control  ...
  └─ treat:    npm run scan -- --out out/track-a-ab-network --network-evidence ...
```

If full 80 is too slow under shared machine with 10k: run **min 30** completed per arm and document partial.

## Related Code Files

- Use: `cli/index.ts` flags; existing scan resume
- Create: out dirs + profiles `chrome-profile-track-a-ab-{control,network}`
- Optional: thin driver script under `scripts/` (only if needed)

## Implementation Steps

1. Copy `plans/reports/track-a-ab-sample-companies.json` into each arm's `--out` as `companies.json` (CLI resume/scan input shape — verify against existing out layouts).
2. **Sequential default:** finish control (≥30 done or exhausted) before starting treatment when live 10k `cli_procs`≥9. Parallel arms only if load clearly idle.
3. Control argv: resume/scan ethics only — **no** `--network-evidence`, **no** `--lazy-settle`.
4. Treatment argv: same + `--network-evidence` only.
5. Export CSV; count `method=network` and platform/network nonempty. `method=network=0` is a valid result — record it.

## Todo

- [x] Materialize input
- [x] Control run
- [x] Treatment run
- [x] Capture counts for phase 4

## Success Criteria

- [x] Both outs exist with results
- [x] Treatment shows documented `method=network` count (may be 0 — still report)
- [x] Live 10k still running without Track A flags
