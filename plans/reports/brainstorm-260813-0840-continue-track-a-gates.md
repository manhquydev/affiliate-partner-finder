# Brainstorm: Continue Track A after cook (Herdr orchestration)

**Timestamp:** 2026-08-13 08:40 +07

## Contract

| Field | Content |
|-------|---------|
| **Outcome** | Track A code gated for ship: full unit tests green + evidence-based code-review of pending Track A diff; plan phases checked; clear GO/NO-GO for `ak:ship`. |
| **Constraints** | Herdr: `cursor-agent --yolo` via `herdr agent start/prompt`; do not enable flags on live 10k; no commit/push unless user asks; don't kill shards. |
| **Non-goals** | A3 HITL labeling now; PR open without review; desktop e2e unless unit suite green; scope creep into Track B code. |
| **Acceptance** | `plans/reports/test-260813-track-a.md` + `plans/reports/code-review-260813-track-a.md` with STATUS; `ak plan check` phases 1–3 (and 5 if docs done); orchestrator GO/NO-GO. |

## Chosen direction

**Parallel Herdr agents on existing idle panes** (`cook-a`=test, `cook-b`=review, `plan-rt`=plan bookkeeping). Skip new tabs.

Sequence after both settle: if review BLOCKED → fix via cook-a; else report ready for user-approved ship.
