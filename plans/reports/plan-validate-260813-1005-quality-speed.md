# Plan Validate — quality-speed Track A wire + A/B

**Timestamp:** 2026-08-13 10:08 +07  
**Plan:** `plans/260813-1004-quality-speed-track-a-wire-and-ab/`  
**Mode:** `--auto` (self-answer per user: quality+speed)

## Verification Results

| Claim | Result | Evidence |
|-------|--------|----------|
| Desktop IPC passes Track A flags | VERIFIED | `desktop/main.ts:232-235` |
| UI checkboxes exist | VERIFIED | `desktop/renderer/index.html` |
| early-exit×networkHits | VERIFIED | `cli/scan.ts:154-163`, `lib/early-exit.ts` |
| ETA min rate | VERIFIED | `desktop/eta.ts` MIN_USABLE_RATE |
| shard-relaunch omits Track A | VERIFIED | `scripts/shard-relaunch.mjs` args L115-132 |
| Sample companies.json | VERIFIED | `plans/reports/track-a-ab-sample-companies.json` n=40 |

Tier: Standard · Failures: 0

## Critical questions (self-answered)

| Q | Answer |
|---|--------|
| Sample size 80 vs 40? | **40** for speed under live 10k — DIRECTIONAL |
| Parallel A/B arms? | **Sequential** — control first |
| Include lazy-settle? | **No** |
| Touch 10k? | **No** |

## Validation Log

**PASS** — proceed cook `--parallel --auto`.
