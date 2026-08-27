---
phase: 2
title: "Profile timing instrumentation"
status: completed
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: Profile timing instrumentation

## Overview

Thêm `--profile-timing` ghi `timingsMs: { goto, settle, detector, probe, total }` vào JSONL/ScanResult — **không** đổi CSV end-user.

## Requirements

- Functional: CLI flag `--profile-timing`; optional field on `ScanResult`
- Non-functional: zero overhead when flag OFF (no extra Date.now in hot path beyond one branch)

## Architecture

Instrument in `cli/scan.ts` `scanOnPage()`:

```typescript
// pseudo
const t0 = profileTiming ? Date.now() : 0;
await page.goto(...); const tGoto = ...
await settleForScan(...); const tSettle = ...
det = await evaluateInjectable(...); const tDet = ...
probe = await pathProbe(...); const tProbe = ...
result.timingsMs = { goto, settle, detector, probe, total };
```

## Related Code Files

- Modify: `lib/types.ts` — optional `timingsMs?: Record<string, number>`
- Modify: `cli/scan.ts` — timers + `ScanCliOptions.profileTiming`
- Modify: `cli/index.ts` — parse `--profile-timing`
- Create: `test/profile-timing.test.ts` or extend `cli/scan` tests
- Create: `scripts/analyze-track-s-timings.mjs` — P50/P95 from JSONL

## Implementation Steps

1. Extend `ScanResult` type (optional field)
2. Wrap phases in `scanOnPage` with conditional timing
3. CLI arg + help text
4. Unit test: mock timing object present when flag on
5. Run baseline on cohort 200 → `metrics-track-s-baseline.md`

## Success Criteria

- [x] `--profile-timing` appears in `--help`
- [x] JSONL rows contain `timingsMs` when flag on; absent when off
- [x] `toSimpleCSV` unchanged (no timings column)
- [x] Analyzer script outputs P50/P95 per phase

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Type drift extension | Field optional; extension ignores unknown keys |
