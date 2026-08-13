---
phase: 2
title: "Build none-ok sample domains"
status: pending
priority: P1
effort: "1h"
dependencies: []
---

# Phase 2: Build none-ok sample domains

## Overview

Build a fixed ≤80 domain list from merge artifacts (`none@ok` preferred; pad with ok if needed) for A/B — **never** rewrite live shard company lists.

## Requirements

- Functional: `plans/reports/track-a-none-ok-sample-domains.txt` (≤80 lines, domains)
- Functional: `plans/reports/track-a-ab-sample-companies.json` — **full company rows** with usable `websiteUrl`/`url` from merge jsonl (MUST-FIX: not domains-only)
- Functional: Prefer `loadStatus=ok` + `verdict=none`; low link density if available
- Non-functional: Read-only vs `design-full-10k-shards/`

## Related Code Files

- Create: `plans/reports/track-a-none-ok-sample-domains.txt`
- Create: `plans/reports/track-a-ab-sample-companies.json`
- Create (optional helper): `scripts/build-track-a-sample.mjs` or one-shot node in cook report
- Read: `out/design-full-10k/results.merged.jsonl` or shard jsonl / full CSV

## Implementation Steps

1. Parse merge jsonl for none@ok (and ok pool) — keep `domain`, `websiteUrl`/`finalUrl`, `company` fields needed by CLI.
2. Sample ≤80 unique domains; write domain list + companies.json.
3. Record counts in cook note (pool size, sample size). Drop rows lacking a http(s) URL.

## Todo

- [x] Extract pool from jsonl
- [x] Write domain list ≤80
- [x] Write companies.json with URLs
- [x] Document n in cook report

## Success Criteria

- [x] Domain file exists with 1 domain/line, ≤80, no blanks
- [x] companies.json length matches sample; every row has http(s) URL
- [x] Source cohort documented
