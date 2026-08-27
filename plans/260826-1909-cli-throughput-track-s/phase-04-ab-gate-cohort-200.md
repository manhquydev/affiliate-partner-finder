---
phase: 4
title: "A/B gate cohort 200"
status: pending
priority: P1
effort: "1d"
dependencies: [3]
---

# Phase 4: A/B gate cohort 200

## Overview

Paired A/B via **mandatory** `scripts/track-s-ab.sh` (seed + run both arms). Gate variable: **`--probe-parallel` only**.

## Requirements

- Functional: shell runs seed + control scan + treatment scan sequentially
- Non-functional: allowlist `out/track-s-*`; deny `*design-full-10k*`; concurrency 2; `--scan-profile`

## Architecture

```bash
# track-s-ab.sh (MUST run scans, not preflight-only)
node scripts/seed-track-s-companies.mjs plans/reports/track-s-benchmark-cohort-200.json out/track-s-ab-control
npm run scan -- --resume --out out/track-s-ab-control --scan-profile --accept-failures --concurrency 2

node scripts/seed-track-s-companies.mjs ... out/track-s-ab-treatment
npm run scan -- --resume --out out/track-s-ab-treatment --scan-profile --accept-failures --concurrency 2 --probe-parallel
```

**Profile timing:** OFF on both arms for gate wall-clock. Optional diagnostic rerun with `--profile-timing` on **both** arms after gate.

## Quality gate (single bar)

| Check | Pass |
|-------|------|
| Throughput | treatment ↑≥25% vs control wall-clock |
| Golden | `verify-golden.mjs` FP=0 on overlapping domains |
| none@ok FN | paired diff **0** new false (none stays none on ok pages) |
| Ethics | blocked→none=0 |
| Report | `plans/reports/metrics-track-s-ab.md` ends with `GATE: PASS` or `GATE: FAIL` |

none→affiliate/partner with new path evidence: **allowed** (recall improvement).

If cohort n<200: banner `DIRECTIONAL` at top of metrics file; gate still runs but not production-claim.

## Related Code Files

- Create: `scripts/track-s-ab.sh`
- Create: `plans/reports/metrics-track-s-ab.md`

## Success Criteria

- [ ] `track-s-ab.sh` exits non-zero on deny path
- [ ] Both arms complete 200/200
- [ ] `GATE: PASS` only if all checks pass

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Preflight-only repeat Track A mistake | script invokes npm scan |
| Treatment confound | no profile-timing on gate runs |

<!-- Updated: Red Team RT-S-03, RT-S-05, RT-S-10 -->
