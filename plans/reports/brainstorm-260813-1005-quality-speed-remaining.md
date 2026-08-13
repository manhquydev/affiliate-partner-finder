# Brainstorm: Quality + speed remaining delivery

**Timestamp:** 2026-08-13 10:05 +07  
**Advice:** `advise-260813-1005-quality-speed-remaining.md`

## Contract (accepted — autonomous)

| Field | Content |
|-------|---------|
| **Outcome** | Track A surface complete (CLI+desktop wire) + **measured** network-evidence signal on a small copy cohort; live 10k keeps speed path (flags OFF). |
| **Constraints** | TS+PW; concurrency≤3; no CF bypass; no mid-flight 10k flag enable; A7>A6; sample ≤80 domains; CLI-first. |
| **Non-goals** | Lazy-settle A/B this sprint; extension parity; Track B timeout code; LLM; AI crawler ports; unknown% as KPI. |
| **Acceptance** | Tests green; desktop can pass network/lazy/early-exit via UI; A/B report with control vs treatment counts; 10k argv still sans Track A flags. |

## Approaches compared

| # | Approach | Trade-off |
|---|----------|-----------|
| 1 | Mega plan A+B+extension | Reject — mixes KPIs, slow |
| 2 | Measure only, leave wire uncommitted | Quality data OK but desktop incomplete |
| 3 | **Wire + network-only A/B (chosen)** | Completes product surface + quality evidence; protects speed |

## Recommendation

Proceed `ak:plan` slug: **quality-speed-track-a-wire-ab** → red-team → validate → cook `--parallel --auto` → test → code-review.

## Handoff

→ Plan phases: (1) wire verify/finish (2) sample build (3) A/B runs (4) metrics report  
→ Do not relaunch 10k with Track A flags
