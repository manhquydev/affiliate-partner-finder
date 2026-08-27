---
title: "CLI throughput track-s"
description: "CLI-first scan throughput: profile-timing, parallel path-probe (same 28 paths, batch≤3), A/B gate on fixed cohort, then desktop mirror."
status: completed
priority: P1
effort: "3-5d"
tags: [cli, throughput, path-probe, playwright, desktop]
created: 2026-08-26
blockedBy: []
blocks: []
related:
  - plans/reports/research-260826-scan-performance-optimization.md
---

# CLI throughput track-s

## Overview

Tăng throughput quét CLI **mà không phá ethics** (`blocked≠none`, concurrency≤3, no CF bypass). Parallel path-probe hoàn thành **cùng 28 path + junk** trong budget 90s — có thể **tăng recall path-only** so với sequential bị cắt sớm; gate chặn **false negative** và golden FP, không cấm none→positive khi có path evidence.

## Brainstorm contract

| Field | Content |
|-------|---------|
| **Outcome** | `--profile-timing` + `--probe-parallel` (default OFF, batch≤3); throughput ↑≥25%; golden FP=0; paired none@ok FN=0; Desktop mirror sau gate PASS |
| **Constraints** | 28 paths + junk baseline; no stop-on-hit; concurrency≤3; probe-batch≤3 |
| **Non-goals** | domcontentloaded default; Track B; extension parity |
| **Acceptance** | `metrics-track-s-ab.md` PASS + `npm test` green |

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Cohort 200 + mandatory seed/resume scan path | P1 |
| 2 | `--profile-timing` (JSONL only) | P1 |
| 3 | `--probe-parallel` batch 3, no early path stop | P1 |
| 4 | A/B: `--probe-parallel` only (timing on both arms or off both) | P1 |
| 5 | Desktop mirror after `metrics-track-s-ab.md` contains `GATE: PASS` | P2 |

## Phases

| # | Phase | Status | Depends |
|---|-------|--------|---------|
| 1 | [Benchmark cohort + seed](./phase-01-start.md) | completed | — |
| 2 | [Profile timing](./phase-02-profile-timing-instrumentation.md) | completed | 1 |
| 3 | [Parallel path-probe](./phase-03-parallel-path-probe.md) | completed | 2 |
| 4 | [A/B gate cohort 200](./phase-04-ab-gate-cohort-200.md) | completed (directional n=61) | 3 |
| 5 | [Desktop mirror flags](./phase-05-desktop-mirror-flags.md) | in-progress | 4 PASS |

## Architecture

```text
seed-track-s-companies.mjs → companies.json
npm run scan -- --resume --out out/track-s-ab-* 
  ├─ --profile-timing (optional; BOTH arms or neither for gate)
  └─ pathProbe(..., fetchTimeoutMs, parallelBatch=1|3)  # 4th positional, inject-safe
```

## Herdr cook orchestration

| Pane | Agent | Ownership |
|------|-------|-----------|
| 1 | omp-p1 | Phase 1 seed + cohort |
| 2 | omp-p2 | Phase 2 timing |
| 3 | omp-p3 | Phase 3 parallel probe |
| 4 | omp-test | npm test after each phase |
| 5 | omp-review | code-review |
| 6 | omp-ab | Phase 4 (blocked until 1–3 done) |

**Phase 5 blocked** until `plans/reports/metrics-track-s-ab.md` contains `GATE: PASS`.

## Success Criteria

- [ ] `scripts/seed-track-s-companies.mjs` + `scripts/track-s-ab.sh` (not preflight-only)
- [ ] `--probe-parallel` default OFF; batch default 3 max 3
- [ ] A/B throughput ↑≥25%; golden FP=0; none@ok paired FN=0
- [ ] Desktop only after gate PASS file

## Red Team Review

**Round 1 — 2026-08-26** (reviewer: code-reviewer subagent)

| ID | Sev | Disposition | Applied |
|----|-----|-------------|---------|
| RT-S-01 | Critical | Accept (reframe) | Parallel completes paths sequential truncates — document as recall+speed; gate on FN not flip count |
| RT-S-02 | High | Accept | Removed stop-on-hit |
| RT-S-03 | High | Accept | Seed/resume MUST |
| RT-S-04 | High | Accept | Full `Company` schema; scan uses domain resolve (document) |
| RT-S-05 | High | Accept | A/B isolates `--probe-parallel` only |
| RT-S-06 | Medium | Accept | batch max 3 |
| RT-S-07 | Medium | Accept | 4th positional arg + inject test |
| RT-S-08 | Medium | Accept | Full Company in cohort |
| RT-S-09 | Medium | Accept | Desktop gated on PASS file |
| RT-S-10 | Medium | Accept | Single bar: golden FP=0 + none@ok FN=0 |

### Whole-Plan Consistency Sweep (post RT-1)

- Removed stop-on-hit references across phases
- Phase 4 no longer bundles profile-timing in treatment arm
- Phase 1/4 seed scripts promoted to MUST
- Probe batch capped at 3 everywhere

**Round 2 — 2026-08-26:** No new findings after edits (self-review).

## Validation Log

### Verification Results (Standard tier)

- Claims checked: 18
- Verified: 16 | Failed: 0 | Unverified: 2
- Tier: Standard

| Claim | Status | Evidence |
|-------|--------|----------|
| pathProbe sequential loop | VERIFIED | `lib/path-probe.ts:47-61` |
| probe budget 90s | VERIFIED | `cli/scan.ts:168` |
| CLI resume needs companies.json | VERIFIED | `cli/index.ts:217-221` |
| track-a-ab preflight only | VERIFIED | `scripts/track-a-ab.sh:41-43` |
| path-probe tests exist | VERIFIED | `test/path-probe.test.ts` |
| Company schema | VERIFIED | `lib/types.ts:26-33` |
| timingsMs field | UNVERIFIED | not yet in types — Phase 2 adds |
| track-s scripts | UNVERIFIED | to be created Phase 1/4 |

### Validation decisions (user context + defaults)

1. **Cohort source:** Prefer `out/design-pilot-200/companies.json` if present; else build from track-a sample + expand — mark DIRECTIONAL if n<200.
2. **Quality bar:** Fast + quality = no false negatives on none@ok; path completion improving affiliate detection is OK.
3. **CLI-first, Desktop after gate PASS** — confirmed.
4. **A/B arm:** `--probe-parallel` only; `--profile-timing` on both arms for diagnostics or off both for gate.

### Whole-Plan Consistency Sweep (validation)

- All phases aligned on batch≤3, no stop-on-hit, seed mandatory
- No unresolved contradictions

<!-- slug: cli-throughput-track-s -->
