---
title: "Phase 5: Optional early-exit (off) + throughput bench"
status: todo
phase: 5
effort: "0.5d"
dependencies: [4]
---

<!-- Updated: Red Team Review 2026-08-10 -->

# Phase 5: Optional early-exit (off) + throughput bench

## Overview

Optional speed stretch **after** accuracy + resume floors. Early-exit path-probe is **DEFAULT OFF** (`--early-exit` to enable). **No domain-day cache** (RT-10). Throughput ≥3× is a **stretch metric only**, not a hard gate. MVP default: always path-probe when load ok (parity with extension).

## Requirements

- [x] Default path: always `pathProbe` when `loadStatus === 'ok'` (extension parity)
- [x] Optional `--early-exit`: skip path-probe only when homepage already has strong link **or** platform hits
- [x] **No** domain-day HTML/result cache
- [x] If implementing early-exit helper: unit-test `shouldSkipPathProbe`
- [x] Bench: same query+limit CLI vs extension serial; document ≥3× as stretch (honest shortfall OK)
- [x] `npm test` / golden green before enabling early-exit in a run

## Architecture

### Default (MVP)

```
det = evaluate(runDetector)
if det.loadStatus === 'ok':
  probe = evaluate(pathProbe)   // always
classify(...)
```

### Optional `--early-exit`

```
strongHome = det.linkHits.some(isStrong) || platformHits.length > 0
if ok && strongHome → skip pathProbe
else if ok → pathProbe
```

Path-only affiliate (classify row 3) must still probe when homepage weak.

### Bench (stretch)

Same machine/query/limit; record wall time + companies/hour + unknown rate. Target ≥3× is aspirational under ethics caps (concurrency≤3, delayMs floor) — do not drop delay or raise concurrency to game the number.

## Related Code Files

- Optional modify: `cli/scan.ts` (early-exit branch behind flag)
- Optional modify: `cli/index.ts` (`--early-exit`)
- Optional: pure `shouldSkipPathProbe` + unit test
- Do **not** create domain-day `cli/cache.ts`
- Keep extension scan path unchanged

## Implementation Steps

1. Confirm phase 2 golden + phase 4 resume green.
2. Leave always-path-probe as default.
3. If shipping optional early-exit: add `--early-exit`, `shouldSkipPathProbe` + unit tests.
4. Run bench protocol; write numbers or gap cause under `plans/reports/` or README.
5. Do not treat <3× as cook failure.

## Todo

- [x] Default always path-probe
- [x] Optional `--early-exit` + `shouldSkipPathProbe` tests (if implementing)
- [x] No domain-day cache
- [x] Bench notes (stretch ≥3×)
- [x] `npm test` green

## Success Criteria

- [x] Default CLI behavior matches “always path-probe when ok”
- [x] With `--early-exit`: strong homepage still affiliate/high; path-only sites still probed
- [x] Golden floors hold
- [x] Bench documented as stretch (pass/shortfall both OK)
- [x] No cache feature shipped

## Risk Assessment

| Risk | L×I | Mitigation |
|------|-----|------------|
| Default-on early-exit breaks parity | H | Default OFF (RT-11) |
| ≥3× as hard gate fights ethics | H | Stretch only (RT-9) |
| Cache YAGNI / stale none | H | Removed (RT-10) |

## Rollback

Remove `--early-exit` branch; ignore any experimental helper.

## Test plan

- [x] `npm test`
- [x] Unit: `shouldSkipPathProbe` (if helper exists)
- [x] Manual default: probe always runs on ok load
- [x] Manual `--early-exit`: path-only site still probed
- [x] Bench table or shortfall note

## Validation Log

> `--auto` validation adopts the Decisions section in `plan.md` (and Red Team Review Accept table). Confirm early-exit default OFF and no domain-day cache before cook.
