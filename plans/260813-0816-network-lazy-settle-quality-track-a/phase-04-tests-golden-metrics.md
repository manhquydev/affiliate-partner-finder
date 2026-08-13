---
title: "Phase 4: Tests golden metrics"
status: in-progress
priority: P1
effort: "3-5h"
dependencies: [2, 3]
---

# Phase 4: Tests golden metrics

## Overview

Lock regressions with golden/unit tests and publish a measurement recipe so “quality↑” is numeric, not anecdotal.

## Requirements

- [ ] Golden fixtures: no new false `affiliate` on known-none
- [ ] Unit: network host matcher edge cases (substring false positives like `drawing.com` vs `awin`)
- [x] Script or documented one-liner: sample N `none@ok` from CSV, rescan with flags, compare verdict deltas
- [x] Record baseline snapshot path under `plans/reports/`

## Related Code Files

- Modify: `test/fixtures/golden.ts`, new `test/network-hosts.test.ts`, classify tests
- Create: `scripts/measure-track-a-sample.mjs` (optional) or docs-only recipe

## Implementation Steps

1. Expand unit coverage for matcher + classify.
2. Run full `npm test`.
3. Write `plans/reports/metrics-260813-track-a-baseline.md` with measurement recipe + freeze numbers.

## Todo

- [ ] Tests
- [x] Baseline metrics report
- [ ] `npm test` green

## Success Criteria

- [ ] CI-local `npm test` pass
- [x] Explicit Track A KPIs listed (not unknown%)
- [x] Baseline report includes R2 A1–A7 freeze numbers:

| ID | Metric | Freeze | Target |
|----|--------|--------|--------|
| A1 | affiliate% among ok | 161/2514 = 6.40% | +≥1.0 pp (≥7.40%) on ≥200 ok re-scan |
| A2 | platform/network hits on affiliates | 12 platform | ≥5× (≥60) or ≥40 network hits on 200-site A/B |
| A3 | none→positive on labeled FN | unlabeled | ≥8 true flips on 30–50 HITL labels, precision ≥90% |
| A4 | false affiliate on golden none | 5 none cases | 0 new |
| A5 | golden suite | green | stay green |
| A6 | added latency | settle 1200ms | ≤+1.5s/page mean; p90 ≤+5% |
| A7 | throughput @3×3 | noisy ~25–90/h | no worse than −10% vs control |

DoD Track A: (A1∨A2∨A3) + A4+A5 + A6+A7. **Never** unknown% (Track B).
A3 labels are a measurement gate, not a blocker to start phases 1–3 code.

## Cook note (2026-08-13)

Partial: baseline + recipe in `plans/reports/metrics-260813-track-a-baseline.md`. Matcher/golden test expansion still depends on phase-1/2. See `plans/reports/cook-260813-phase04-metrics.md`.