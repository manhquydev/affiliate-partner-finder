---
phase: 1
title: "Benchmark cohort + seed"
status: completed
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Benchmark cohort + seed

## Overview

Cohort 200 domain cố định + **mandatory** seed script producing valid `Company[]` for `--resume` scan (no Trustpilot collect).

## Requirements

- Functional: `build-track-s-cohort.mjs` + `seed-track-s-companies.mjs`
- Non-functional: full `Company` schema per `lib/types.ts:26-33`

## Architecture

Priority sources:
1. `out/design-pilot-200/companies.json` (200 rows, full Company)
2. Else merge from `plans/reports/track-a-ab-sample-companies.json` + deterministic expand to 200

Output:
- `plans/reports/track-s-benchmark-cohort-200.json` — full `Company[]`
- `scripts/seed-track-s-companies.mjs` — writes `companies.json` + `progress.json` to `out/track-s-*`

**URL note:** scan resolves `https://{domain}` today (`cli/index.ts:386`, `lib/resolve.ts`). Cohort stores full Company for export parity; URL drift documented in metrics header.

## Related Code Files

- Create: `scripts/build-track-s-cohort.mjs`, `scripts/seed-track-s-companies.mjs`
- Create: `plans/reports/track-s-benchmark-cohort-200.json`
- Pattern: `scripts/seed-track-a-companies.mjs` (fix: use `Company` fields, not `website`)

## Implementation Steps

1. Build cohort script — deterministic, 200 entries, each with `name,domain,trustScore,reviews,trustpilotUrl`
2. Seed script: `node scripts/seed-track-s-companies.mjs <cohort.json> <out-dir>`
3. Verify `npm run scan -- --resume --out <dir>` starts without `--query`
4. Stub `plans/reports/metrics-track-s-baseline.md`

## Success Criteria

- [x] Exactly 200 valid `Company` rows (nullable trustScore/reviews OK)
- [x] Seed → resume scan starts (0 collect)
- [x] Rerun seed is idempotent

## Risk Assessment

| Risk | Response |
|------|----------|
| pilot-200 missing | Expand track-a sample; banner `DIRECTIONAL` if n<200 |

<!-- Updated: Red Team RT-S-03, RT-S-08 -->
