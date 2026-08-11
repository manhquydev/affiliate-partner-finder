---
title: "Code Review — CLI simple CSV accuracy floor"
date: 2026-08-10
status: complete
---

# Code Review — 260810-2340 — CLI + simple CSV

See also: `plans/reports/test-260810-2340-tool-result-verify.md`

## Verdict
**request-changes** on accuracy floor; Critical probe→false mitigated in working tree (not committed).

## Critical (mitigated)
Path-probe abort left `loadStatus=ok` + empty `pathHits` → `simpleHit=false`. Fixed in `cli/scan.ts`: incomplete probe without homepage signals → `timeout`/`unknown`.

## Important (open)
1. Outer scan budget can drop detector hits mid-flight
2. End-user CSV missing strongest-evidence URL
3. Live golden still FAIL on CF-blocked affiliates

## Tests
70/70 unit PASS after semantics additions; live golden FAIL (affiliate-high 2/4).
