---
title: Cook P4 partial pathHits on abort
date: 2026-08-27
summary: Inner deadline keeps prefix hits; empty incomplete stays timeout/unknown; 199/199
---

# Cook P4 partial pathHits on abort

## What happened
P4 partial pathHits on abort. Inner budgetMs deadline skips later chunks, returns prefix + incomplete. CLI keeps hits; empty incomplete still timeout (never none). Shared code, not a treatment flag.

## Verification
path-probe 16/16, classify 32/32, isolation 3/3, npm test 199/199. probe-parallel default OFF. No stop-on-hit, no shared AbortController.

## Next steps
P5 n=200 cohort recover, then P6 A/B. Ask commit P4.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
