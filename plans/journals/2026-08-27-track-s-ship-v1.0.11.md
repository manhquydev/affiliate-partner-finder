---
date: 2026-08-27
summary: Ship v1.0.11 — Track S opt-in probe-parallel, isolation fix, CLI profile guard
---

# Track S ship — v1.0.11

## What happened

- Completed Track S phases 1–5: cohort tooling, `--profile-timing`, `--probe-parallel` (batch≤3, default OFF), directional A/B gate, desktop checkbox mirror.
- Fixed critical isolation bug: profile mode must use `context.newPage()` per company, not shared keepAlive tab (had caused 16/61 cross-domain rows in first A/B).
- Re-ran paired A/B after fix: **37.6%** wall-clock speedup, **0 true→false**, **0 cross-domain**, ethics PASS.
- Herdr OMP swarm (12 agents) produced independent eval → land as **1.0.11 opt-in**.
- Implemented SHIP nits: isolation regression tests, `toInjectableSource` inject tests, CLI `--profile` User Data guard, e2e `#probeParallel` unchecked, docs.

## Evidence (measured)

| Metric | Value | Source |
|--------|-------|--------|
| Cohort n (directional) | 61 paired | `plans/reports/metrics-track-s-ab.md` |
| Control wall | 1098s | same |
| Treatment wall | 685s | same |
| Speedup | **37.6%** (gate ≥25%) | same |
| true→false regression | **0** | same |
| cross-domain finalUrl | **0** | same |
| blocked→none ethics | PASS | same |
| Unit tests | **180/180** | `npm test` 2026-08-27 |
| track-s suite | **22/22** | `npm run test:track-s` |

Golden lane still FAIL (vecteezy CF, mohd.it) — **non-blocking** for directional throughput; separate Track B/A work.

## Decision

- Ship **v1.0.11** with `--probe-parallel` / desktop checkbox **default OFF**.
- Do **not** retag v1.0.10.
- Production throughput claim waits n=200 cohort re-collect.

## Next steps

- MEASURE: n=200 A/B without directional banner.
- Golden: dedicated 13-site job, HITL profile for CF sites.
- Compile debt: `tsc` green → CI gate (P2).
