---
title: Track S phase 2 profile-timing
date: 2026-08-26
summary: Optional --profile-timing JSONL timings; default OFF; Phase 3 not started
---

# Track S phase 2 profile-timing

## What happened
Implemented Track S Phase 2 only: optional ScanResult.timingsMs, --profile-timing (default OFF), scanOnPage phase timers, analyze-track-s-timings.mjs, tests.

## Decision
Keep timings off the hot path unless the flag is on (Date.now only after the enabled guard). Attach timings in scanOnPage finally so timeout/error returns are still measurable. Stamp budget-timeout rows from scanOneCli with total elapsed and zeroed phases. Did not start Phase 3.

## Next steps
Phase 3 only on request. Live cohort baseline still needs an ops Chrome profile (metrics-track-s-baseline.md stub).

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
