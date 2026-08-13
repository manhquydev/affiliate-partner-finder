---
title: "Phase 5: Ops track B notes"
status: done
priority: P2
effort: "1-2h"
dependencies: []
---

# Phase 5: Ops track B notes

## Overview

Document parallel **Track B** (reduce blocked/timeout/unknown) as ops — not product code in this plan. Keeps KPI separation demanded by red-team R2.

## Requirements

- [x] Ops checklist: monitor age, relaunch, CF HITL on virtual display, rate cool-down alerts
- [x] Explicit: no CAPTCHA bypass; no concurrency >3
- [x] Suggest follow-up mini-plan only if timeout budget changes need code
- [x] Do not stop or reconfigure live 10k without user approval

## Related Code Files

- Create: `plans/reports/ops-260813-track-b-access-runbook.md`
- Reference: `scripts/shard-monitor-loop.sh`, `scripts/shard-relaunch.mjs`

## Implementation Steps

1. Summarize unknown×loadStatus table from R2.
2. Write runbook actions + owners (user/ops).
3. Optional: Herdr pane reminder for watch-only.

## Todo

- [x] Runbook markdown
- [x] Link from plan.md / README ops section if appropriate (minimal)

## Success Criteria

- [x] Runbook exists with numeric baseline
- [x] Clear “code changes require separate plan” note

## Cook note (2026-08-13)

Confirmed present: `plans/reports/ops-260813-track-b-access-runbook.md`. Linked from plan.md Success Criteria. No live-shard reconfigure.