# Plan Red-Team — quality-speed Track A wire + A/B

**Timestamp:** 2026-08-13 10:08 +07  
**Plan:** `plans/260813-1004-quality-speed-track-a-wire-and-ab/`  
**Mode:** `--hard --parallel --auto`

## Pre-applied MUST-FIX (auto)

| Sev | Finding | Disposition | Plan fix |
|-----|---------|-------------|----------|
| High | Domains-only sample lacks scan input shape | **Accept** | companies.json from merge + source companies |
| High | n≤80 vs A2≥200 overclaim | **Accept** | DIRECTIONAL only; never A2 PASS |
| Med | A/B + 10k contention | **Accept** | Sequential arms; concurrency≤2; trim sample to 40 for speed |
| Med | method=network=0 misread as wire failure | **Accept** | Valid measurement outcome |
| Med | Accidental 10k flag enable | **Accept** | Hard rule; shard-relaunch unchanged |

## Reviewer notes

Hostile lenses (Security / Assumptions / Failure modes) spawned in parallel; locks above already merged into `plan.md` + phases 2–4 before cook. Live cook uses **40** domains DIRECTIONAL.

### Whole-Plan Consistency Sweep

- Phase 2 requires `track-a-ab-sample-companies.json`
- Phase 3 sequential + no lazy
- Phase 4 DIRECTIONAL header mandatory
