---
title: "Quality speed Track A wire and A/B"
description: "Finish desktop/CLI Track A wire; bounded network-evidence A/B on copy cohort; protect live 10k speed."
status: completed
priority: P1
effort: "1-2d"
tags: [quality, speed, track-a, ab, desktop]
created: 2026-08-13
related:
  - plans/reports/advise-260813-1005-quality-speed-remaining.md
  - plans/reports/brainstorm-260813-1005-quality-speed-remaining.md
  - plans/reports/metrics-260813-track-a-baseline.md
---

# Quality speed Track A wire and A/B

## Overview

Close the remaining Track A **product surface** (desktop IPC/UI + early-exit×networkHits + ETA floor) and run a **small** `--network-evidence` A/B on a copy cohort to get quality signal — without touching live design-full-10k flags or running lazy-settle A/B (speed).

## Brainstorm contract

| Field | Content |
|-------|---------|
| **Outcome** | Wire complete + measured network signal on ≤80 domains; 10k flags OFF |
| **Constraints** | concurrency≤3; ethics; A7>A6; no mid-flight 10k Track A flags |
| **Non-goals** | Lazy A/B; extension; Track B timeout code; LLM; unknown% KPI |
| **Acceptance** | `npm test` green; A/B report; 10k argv unchanged |

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Verify/finish desktop+early-exit+ETA wire | P1 |
| 2 | Build ≤80 domain sample from merge CSV/jsonl | P1 |
| 3 | Control vs `--network-evidence` treatment jobs | P1 |
| 4 | Metrics report bind A2 (±A1); no unknown% claim | P1 |

## Phases

| # | Phase | Status | Depends |
|---|-------|--------|---------|
| 1 | [Wire verify finish](./phase-01-start.md) | Done | — |
| 2 | [Build none-ok sample](./phase-02-build-none-ok-sample-domains.md) | Done | — |
| 3 | [Network A/B jobs](./phase-03-network-evidence-ab-sample-jobs.md) | Done | 1,2 |
| 4 | [Metrics A2 bind](./phase-04-metrics-report-a2-bind.md) | Done | 3 |

## Success Criteria

- [x] Desktop checkboxes → IPC → `--network-evidence` / `--lazy-settle` / `--early-exit` (default OFF)
- [x] early-exit skips path-probe when `networkHits` nonempty
- [x] ETA refuses rate &lt; 2/h
- [x] Sample file ≤80 domains committed under `plans/reports/`
- [x] Control + treatment `--out` dirs under `out/track-a-ab-*` (not design-full-10k)
- [x] Metrics report documents `method=network` / platform hits; **forbids** unknown%↓ claim
- [x] Live 10k never receives Track A flags during this plan
- [x] `npm test` exit 0

## Risks

| Risk | Mitigation |
|------|------------|
| A/B slows machine vs 10k | Cap ≤80; concurrency≤2 on sample; **prefer sequential** arms if 10k hot; separate profiles |
| FP affiliates on treatment | Golden + allowlist-only matcher; abort narrative if A4 fails |
| Accidental 10k flag | Hard rule in every phase; relaunch scripts unchanged |
| Domains-only input missing URLs | **MUST:** materialize `companies.json` from merge **jsonl rows** (`domain`+`websiteUrl`/`finalUrl`), not bare domain list alone |
| n≤80 vs baseline A2 (≥200) | Report as **DIRECTIONAL only** — never claim A2 PASS/DoD met |
| treatment `method=network=0` | Still a valid measurement outcome; do not “fix” by enabling on 10k |

## Red Team Review

**Mode:** `--hard --parallel --auto` (user auto-apply). Pre-applied MUST-FIX locks above before reviewer return; reviewers adjudicated in `plans/reports/plan-redteam-260813-1005-quality-speed.md`.

### Whole-Plan Consistency Sweep

- Phases 2–4 updated to require jsonl row materialization + DIRECTIONAL labeling.
- Phase 3 sequential preference + no lazy flag restated.
- Success criteria forbid A2 PASS claim at n&lt;200.

<!-- slug: quality-speed-track-a-wire-and-ab -->
