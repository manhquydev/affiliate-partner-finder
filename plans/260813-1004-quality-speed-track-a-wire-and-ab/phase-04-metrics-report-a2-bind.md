---
phase: 4
title: "Metrics report A2 bind"
status: pending
priority: P1
effort: "1h"
dependencies: [3]
---

# Phase 4: Metrics report A2 bind

## Overview

Write compare report binding R2 **A2** (primary) and A1 if sample includes enough prior-ok mix. Explicitly state A8/unknown% is **out of scope**.

## Requirements

- Create: `plans/reports/metrics-260813-track-a-ab-network.md`
- Tables: control vs treatment — affiliate%, platform/network nonempty, `method=network` count, mean latency if available
- Ship rule text: MUST NOT claim unknown%↓ from this A/B

## Implementation Steps

1. Parse both arms' results.csv / full csv / jsonl.
2. Compute A2-oriented stats; note sample size limits vs baseline targets.
3. Pass/fail narrative: directional only if n&lt;200.

## Todo

- [x] Compute stats
- [x] Write report
- [x] Cross-link baseline metrics doc

## Success Criteria

- [x] Report exists with numbers + explicit non-claim on unknown%
- [x] References control/treatment out paths
- [x] Header labels result **DIRECTIONAL** when n&lt;200 — never “A2 PASS” / “DoD met”
